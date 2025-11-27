#!/usr/bin/env python3
"""
2L Reflection Aggregator - Group similar learnings into patterns

This utility aggregates reflections into patterns using incremental similarity
matching. It reads global-learnings.jsonl, groups similar issues using
difflib.SequenceMatcher with 0.8 threshold, and updates global-learnings.yaml
with pattern candidates.

Usage:
    # Incremental aggregation (process only new learnings)
    python3 2l-reflection-aggregator.py \
        --mode incremental \
        --global-learnings .2L/global-learnings.yaml \
        --jsonl .2L/global-learnings.jsonl

    # Full aggregation (rebuild from scratch)
    python3 2l-reflection-aggregator.py \
        --mode full \
        --global-learnings .2L/global-learnings.yaml \
        --jsonl .2L/global-learnings.jsonl

    # Dry run (preview without writing)
    python3 2l-reflection-aggregator.py \
        --mode incremental \
        --global-learnings .2L/global-learnings.yaml \
        --jsonl .2L/global-learnings.jsonl \
        --dry-run

Environment:
    Runs in meditation space (~/Ahiya/2L) or project directories

Exit Codes:
    0: Success (aggregation complete)
    1: Error (parsing failed, file missing)
    2: Safety abort (invalid inputs)
"""

import sys
import yaml
import json
import argparse
import fcntl
import re
from pathlib import Path
from datetime import datetime
from difflib import SequenceMatcher
from typing import Dict, List, Optional, Tuple

# Import helper functions from 2l-yaml-helpers.py
# We need to import it dynamically since the filename has a hyphen
import importlib.util
_helpers_path = Path(__file__).parent / "2l-yaml-helpers.py"
_spec = importlib.util.spec_from_file_location("yaml_helpers", _helpers_path)
_yaml_helpers = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_yaml_helpers)
atomic_write_yaml = _yaml_helpers.atomic_write_yaml
backup_before_write = _yaml_helpers.backup_before_write
generate_pattern_id = _yaml_helpers.generate_pattern_id

# Constants
SCHEMA_VERSION = "1.0"
DEFAULT_SIMILARITY_THRESHOLD = 0.8
BORDERLINE_LOG_RANGE = (0.75, 0.85)


class ReflectionAggregator:
    """Aggregate learnings into patterns using fuzzy similarity matching."""

    def __init__(self, similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD):
        """
        Initialize aggregator.

        Args:
            similarity_threshold: Minimum similarity for pattern matching (0.0-1.0)
        """
        self.similarity_threshold = similarity_threshold

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculate similarity ratio between two strings using difflib.

        Uses Ratcliff-Obershelp algorithm (gestalt pattern matching).

        Args:
            text1: First string
            text2: Second string

        Returns:
            Similarity ratio in [0.0, 1.0]
            - 0.0 = completely different
            - 0.8+ = very similar (recommended threshold)
            - 1.0 = identical
        """
        # Normalize (lowercase for case-insensitive comparison)
        norm1 = text1.lower().strip()
        norm2 = text2.lower().strip()

        # Calculate similarity
        return SequenceMatcher(None, norm1, norm2).ratio()

    def find_best_match(
        self, learning: Dict, patterns: List[Dict]
    ) -> Tuple[Optional[Dict], float]:
        """
        Find best matching pattern above similarity threshold.

        Args:
            learning: Learning dictionary with 'root_cause' key
            patterns: List of existing pattern dictionaries

        Returns:
            Tuple of (best_match_pattern, similarity_score)
            Returns (None, 0.0) if no match above threshold
        """
        if not patterns:
            return None, 0.0

        best_match = None
        best_score = 0.0
        learning_text = learning.get("root_cause", "")

        for pattern in patterns:
            # Only compare within same category for better accuracy
            if pattern.get("category") != learning.get("category"):
                continue

            pattern_text = pattern.get("root_cause", "")
            score = self.calculate_similarity(learning_text, pattern_text)

            # Log borderline matches for threshold tuning
            if (
                BORDERLINE_LOG_RANGE[0] <= score <= BORDERLINE_LOG_RANGE[1]
                and score < self.similarity_threshold
            ):
                print(
                    f"   🔍 Borderline match ({score:.3f}): '{learning_text[:50]}...' vs '{pattern_text[:50]}...'",
                    file=sys.stderr,
                )

            if score >= self.similarity_threshold and score > best_score:
                best_match = pattern
                best_score = score

        return best_match, best_score

    def merge_into_pattern(
        self, learning: Dict, pattern: Dict
    ) -> Dict:
        """
        Merge learning into existing pattern.

        Args:
            learning: Learning to merge
            pattern: Existing pattern to merge into

        Returns:
            Updated pattern dictionary
        """
        # Increment occurrence count
        pattern["occurrences"] = pattern.get("occurrences", 1) + 1

        # Add to source learnings list
        if "source_learnings" not in pattern:
            pattern["source_learnings"] = []
        pattern["source_learnings"].append(learning["learning_id"])

        # Add project if not already in list
        project = learning.get("project", "unknown")
        if "projects" not in pattern:
            pattern["projects"] = []
        if project not in pattern["projects"]:
            pattern["projects"].append(project)

        # Update affected files (merge lists)
        if "affected_files" in learning:
            if "affected_files" not in pattern:
                pattern["affected_files"] = []
            for file_path in learning["affected_files"]:
                if file_path not in pattern["affected_files"]:
                    pattern["affected_files"].append(file_path)

        # Update pattern metadata if needed
        # Escalate severity if new learning is more severe
        severity_order = {"low": 1, "medium": 2, "critical": 3}
        current_severity = pattern.get("severity", "low")
        new_severity = learning.get("severity", "low")
        if severity_order.get(new_severity, 0) > severity_order.get(current_severity, 0):
            pattern["severity"] = new_severity

        return pattern

    def create_new_pattern(
        self, learning: Dict, existing_patterns: List[Dict]
    ) -> Dict:
        """
        Create new pattern from learning.

        Args:
            learning: Learning dictionary
            existing_patterns: List of existing patterns (for ID generation)

        Returns:
            New pattern dictionary
        """
        # Generate unique pattern ID
        pattern_id = generate_pattern_id(existing_patterns)

        # Create pattern
        new_pattern = {
            "pattern_id": pattern_id,
            "name": learning.get("issue", "Unknown issue")[:60],  # Truncate
            "occurrences": 1,
            "projects": [learning.get("project", "unknown")],
            "severity": learning.get("severity", "medium"),
            "category": learning.get("category", "functionality"),
            "root_cause": learning.get("root_cause", ""),
            "proposed_solution": learning.get("suggested_fix", ""),
            "status": "IDENTIFIED",
            "discovered_in": f"{learning.get('plan_id', 'unknown')}-iter-{learning.get('iteration', 0)}",
            "discovered_at": learning.get("timestamp", datetime.now().isoformat()),
            "source_learnings": [learning["learning_id"]],
            "affected_files": learning.get("affected_files", []),
        }

        return new_pattern

    def aggregate_learnings(
        self,
        learnings: List[Dict],
        existing_patterns: List[Dict],
        mode: str = "incremental",
    ) -> Tuple[List[Dict], int, int]:
        """
        Aggregate learnings into patterns.

        Args:
            learnings: List of learning dictionaries from JSONL
            existing_patterns: List of existing patterns from YAML
            mode: 'incremental' (process only new) or 'full' (rebuild all)

        Returns:
            Tuple of (updated_patterns, new_pattern_count, merged_count)
        """
        # Track processed learning IDs to avoid duplicates
        processed_learning_ids = set()
        for pattern in existing_patterns:
            processed_learning_ids.update(pattern.get("source_learnings", []))

        new_pattern_count = 0
        merged_count = 0

        # In full mode, start fresh
        if mode == "full":
            existing_patterns = []
            processed_learning_ids = set()

        # Process each learning
        for learning in learnings:
            learning_id = learning.get("learning_id")

            # Skip if already processed (incremental mode)
            if mode == "incremental" and learning_id in processed_learning_ids:
                continue

            # Skip if pattern_id already assigned (already aggregated)
            if learning.get("pattern_id") is not None:
                continue

            # Find best match among existing patterns
            best_match, score = self.find_best_match(learning, existing_patterns)

            if best_match:
                # Merge into existing pattern
                self.merge_into_pattern(learning, best_match)
                merged_count += 1
                print(
                    f"   ✅ Merged learning {learning_id} into {best_match['pattern_id']} (similarity: {score:.3f})"
                )
            else:
                # Create new pattern
                new_pattern = self.create_new_pattern(learning, existing_patterns)
                existing_patterns.append(new_pattern)
                new_pattern_count += 1
                print(
                    f"   🆕 Created new pattern {new_pattern['pattern_id']} from {learning_id}"
                )

            # Mark as processed
            processed_learning_ids.add(learning_id)

        return existing_patterns, new_pattern_count, merged_count


def read_jsonl(jsonl_path: Path) -> List[Dict]:
    """
    Read all entries from JSONL file.

    Args:
        jsonl_path: Path to .jsonl file

    Returns:
        List of dictionaries (one per line)
    """
    if not jsonl_path.exists():
        return []

    learnings = []
    with open(jsonl_path) as f:
        for line_num, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue  # Skip empty lines

            try:
                learnings.append(json.loads(line))
            except json.JSONDecodeError as e:
                # Log error but continue (graceful degradation)
                print(
                    f"WARNING: Malformed JSON at line {line_num}: {e}",
                    file=sys.stderr,
                )
                continue

    return learnings


def load_patterns(learnings_path: Path) -> Tuple[Dict, List[Dict]]:
    """
    Load existing patterns from global-learnings.yaml.

    Args:
        learnings_path: Path to global-learnings.yaml

    Returns:
        Tuple of (global_data_dict, patterns_list)
    """
    if not learnings_path.exists():
        # Initialize empty structure
        global_data = {
            "schema_version": SCHEMA_VERSION,
            "aggregated_at": datetime.now().isoformat(),
            "total_projects": 0,
            "total_learnings": 0,
            "patterns": [],
        }
        return global_data, []

    with open(learnings_path) as f:
        global_data = yaml.safe_load(f) or {}

    patterns = global_data.get("patterns", [])
    return global_data, patterns


def update_global_learnings(
    learnings_path: Path,
    patterns: List[Dict],
    new_pattern_count: int,
    merged_count: int,
    dry_run: bool = False,
) -> None:
    """
    Update global-learnings.yaml with new patterns.

    Args:
        learnings_path: Path to global-learnings.yaml
        patterns: Updated patterns list
        new_pattern_count: Number of new patterns created
        merged_count: Number of learnings merged
        dry_run: If True, don't actually write file
    """
    # Load existing data or create new
    if learnings_path.exists():
        with open(learnings_path) as f:
            global_data = yaml.safe_load(f) or {}
    else:
        global_data = {
            "schema_version": SCHEMA_VERSION,
            "total_projects": 0,
            "total_learnings": 0,
        }

    # Update patterns
    global_data["patterns"] = patterns
    global_data["aggregated_at"] = datetime.now().isoformat()
    global_data["total_learnings"] = len(patterns)

    # Calculate unique projects
    all_projects = set()
    for pattern in patterns:
        all_projects.update(pattern.get("projects", []))
    global_data["total_projects"] = len(all_projects)

    if dry_run:
        print(f"\n🔍 DRY RUN - Would update {learnings_path}:")
        print(f"   Total patterns: {len(patterns)}")
        print(f"   Total projects: {len(all_projects)}")
        print(f"   New patterns created: {new_pattern_count}")
        print(f"   Learnings merged: {merged_count}")
        return

    # Backup before modification
    backup_path = backup_before_write(str(learnings_path))
    if backup_path:
        print(f"   💾 Created backup: {backup_path}")

    # Atomic write
    atomic_write_yaml(str(learnings_path), global_data)
    print(f"   ✅ Updated: {learnings_path}")


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Aggregate learnings into patterns via similarity matching",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Incremental aggregation (default - process only new learnings)
  %(prog)s --mode incremental \\
           --global-learnings .2L/global-learnings.yaml \\
           --jsonl .2L/global-learnings.jsonl

  # Full aggregation (rebuild from scratch)
  %(prog)s --mode full \\
           --global-learnings .2L/global-learnings.yaml \\
           --jsonl .2L/global-learnings.jsonl

  # Custom threshold
  %(prog)s --mode incremental \\
           --global-learnings .2L/global-learnings.yaml \\
           --jsonl .2L/global-learnings.jsonl \\
           --threshold 0.75

  # Dry run (preview without writing)
  %(prog)s --mode incremental \\
           --global-learnings .2L/global-learnings.yaml \\
           --jsonl .2L/global-learnings.jsonl \\
           --dry-run
""",
    )

    parser.add_argument(
        "--mode",
        choices=["incremental", "full"],
        default="incremental",
        help="Aggregation mode (default: incremental)",
    )
    parser.add_argument(
        "--global-learnings",
        required=True,
        help="Path to global-learnings.yaml",
    )
    parser.add_argument(
        "--jsonl",
        required=True,
        help="Path to global-learnings.jsonl",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_SIMILARITY_THRESHOLD,
        help=f"Similarity threshold (default: {DEFAULT_SIMILARITY_THRESHOLD})",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without modifying files",
    )

    args = parser.parse_args()

    try:
        # Validate inputs
        learnings_path = Path(args.global_learnings)
        jsonl_path = Path(args.jsonl)

        if not jsonl_path.exists():
            print(
                f"ERROR: JSONL file not found: {jsonl_path}",
                file=sys.stderr,
            )
            sys.exit(2)

        # Validate threshold
        if not 0.0 <= args.threshold <= 1.0:
            print(
                f"ERROR: Threshold must be in [0.0, 1.0], got {args.threshold}",
                file=sys.stderr,
            )
            sys.exit(2)

        print(f"📊 2L Reflection Aggregator")
        print(f"   Mode: {args.mode}")
        print(f"   Threshold: {args.threshold}")
        print(f"   JSONL: {jsonl_path}")
        print(f"   YAML: {learnings_path}")
        print()

        # Read learnings from JSONL
        print("📖 Reading learnings from JSONL...")
        learnings = read_jsonl(jsonl_path)
        print(f"   Found {len(learnings)} learnings")

        if not learnings:
            print("   ℹ️  No learnings to process")
            sys.exit(0)

        # Load existing patterns
        print("📖 Loading existing patterns...")
        global_data, existing_patterns = load_patterns(learnings_path)
        print(f"   Found {len(existing_patterns)} existing patterns")

        # Aggregate
        print(f"\n🔄 Aggregating learnings ({args.mode} mode)...")
        aggregator = ReflectionAggregator(similarity_threshold=args.threshold)
        updated_patterns, new_count, merged_count = aggregator.aggregate_learnings(
            learnings, existing_patterns, mode=args.mode
        )

        # Update global learnings
        print(f"\n💾 Updating global learnings...")
        update_global_learnings(
            learnings_path,
            updated_patterns,
            new_count,
            merged_count,
            dry_run=args.dry_run,
        )

        # Summary
        print(f"\n✅ Aggregation complete!")
        print(f"   New patterns created: {new_count}")
        print(f"   Learnings merged: {merged_count}")
        print(f"   Total patterns: {len(updated_patterns)}")

        sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
