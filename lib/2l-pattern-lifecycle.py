#!/usr/bin/env python3
"""Pattern Lifecycle Manager - Track patterns from detection to verification.

This utility manages the lifecycle of patterns in the 2L self-improvement system,
implementing a state machine with validation, atomic YAML updates, and JSONL audit trail.

State Machine:
- IDENTIFIED → IMPLEMENTED (after /2l-mvp completes)
- IMPLEMENTED → VERIFIED (after 3 iterations without recurrence)
- IMPLEMENTED → REGRESSED (if pattern recurs)
- VERIFIED → REGRESSED (if previously verified pattern recurs)
- REGRESSED → IMPLEMENTED (fix-and-retry cycle)
"""

import yaml
import json
import argparse
import sys
import os
import tempfile
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List


class PatternLifecycleManager:
    """Manage pattern status transitions with state validation."""

    VALID_STATUSES = ['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED']

    VALID_TRANSITIONS = {
        'IDENTIFIED': ['IMPLEMENTED'],
        'IMPLEMENTED': ['VERIFIED', 'REGRESSED'],
        'VERIFIED': ['REGRESSED'],
        'REGRESSED': ['IMPLEMENTED']
    }

    def __init__(self, global_learnings_path: str = '.2L/global-learnings.yaml'):
        """Initialize lifecycle manager.

        Args:
            global_learnings_path: Path to global learnings YAML file
        """
        self.learnings_path = Path(global_learnings_path)

    def update_status(self, pattern_id: str, new_status: str,
                     metadata: Optional[Dict] = None) -> Dict:
        """Update pattern status with validation and atomic write.

        Args:
            pattern_id: Pattern identifier (e.g., 'PATTERN-001')
            new_status: Target status (IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED)
            metadata: Optional dict with plan_id, iteration, etc.

        Returns:
            Updated pattern dict

        Raises:
            ValueError: If pattern not found or invalid transition
            FileNotFoundError: If global learnings file not found
        """
        # Load current state
        data = self._load_learnings()

        # Find pattern
        pattern = self._find_pattern(data, pattern_id)
        if not pattern:
            raise ValueError(f"Pattern {pattern_id} not found in global learnings")

        # Check current status
        current_status = pattern.get('status', 'IDENTIFIED')

        # Idempotent: No-op if already in target status
        if current_status == new_status:
            print(f"Pattern {pattern_id} already {new_status}")
            return pattern

        # Validate transition
        self._validate_transition(current_status, new_status)

        # Update status and metadata
        pattern['status'] = new_status
        pattern['status_updated_at'] = datetime.now().isoformat()

        # Status-specific metadata
        if new_status == 'IMPLEMENTED':
            pattern['implemented_at'] = datetime.now().isoformat()
            if metadata:
                pattern['implemented_in_plan'] = metadata.get('plan_id')
                pattern['implemented_in_iteration'] = metadata.get('iteration')
                # Start monitoring for verification (3 iterations from now)
                pattern['verification_start_iteration'] = metadata.get('iteration', 0) + 1

        elif new_status == 'VERIFIED':
            pattern['verified_at'] = datetime.now().isoformat()
            if metadata:
                pattern['verified_in_iteration'] = metadata.get('iteration')

        elif new_status == 'REGRESSED':
            pattern['regressed_at'] = datetime.now().isoformat()
            if metadata:
                pattern['regressed_in_plan'] = metadata.get('plan_id')
                pattern['regressed_in_iteration'] = metadata.get('iteration')

        # Apply additional metadata
        if metadata:
            for key, value in metadata.items():
                if key not in pattern:  # Don't override existing fields
                    pattern[key] = value

        # Atomic write with backup
        self._backup_before_write()
        self._atomic_write_yaml(data)

        # Append to JSONL history
        self._append_lifecycle_event(pattern_id, current_status, new_status)

        print(f"✓ Pattern {pattern_id}: {current_status} → {new_status}")
        return pattern

    def get_status(self, pattern_id: str) -> Optional[Dict]:
        """Get current status of a pattern.

        Args:
            pattern_id: Pattern identifier

        Returns:
            Pattern dict or None if not found
        """
        data = self._load_learnings()
        return self._find_pattern(data, pattern_id)

    def list_patterns(self, status: Optional[str] = None) -> List[Dict]:
        """List patterns, optionally filtered by status.

        Args:
            status: Optional status filter (IDENTIFIED|IMPLEMENTED|VERIFIED|REGRESSED)

        Returns:
            List of pattern dicts
        """
        data = self._load_learnings()
        patterns = data.get('patterns', [])

        if status:
            patterns = [p for p in patterns if p.get('status') == status]

        return patterns

    def _validate_transition(self, current: str, new: str):
        """Validate state machine transition.

        Args:
            current: Current status
            new: Target status

        Raises:
            ValueError: If transition is invalid
        """
        if new not in self.VALID_TRANSITIONS.get(current, []):
            valid = self.VALID_TRANSITIONS.get(current, [])
            raise ValueError(
                f"Invalid transition: {current} → {new}. "
                f"Valid transitions from {current}: {valid}"
            )

    def _find_pattern(self, data: Dict, pattern_id: str) -> Optional[Dict]:
        """Find pattern by ID in global learnings.

        Args:
            data: Global learnings data dict
            pattern_id: Pattern identifier

        Returns:
            Pattern dict or None if not found
        """
        for pattern in data.get('patterns', []):
            if pattern.get('pattern_id') == pattern_id:
                return pattern
        return None

    def _load_learnings(self) -> Dict:
        """Load global learnings YAML.

        Returns:
            Global learnings data dict

        Raises:
            FileNotFoundError: If file doesn't exist
        """
        if not self.learnings_path.exists():
            raise FileNotFoundError(f"Global learnings not found: {self.learnings_path}")

        with open(self.learnings_path, 'r') as f:
            return yaml.safe_load(f)

    def _atomic_write_yaml(self, data: Dict):
        """Write YAML atomically using temp file + rename.

        Args:
            data: Data to write

        Raises:
            Exception: If write fails (temp file cleaned up)
        """
        temp_fd, temp_path = tempfile.mkstemp(
            dir=self.learnings_path.parent,
            prefix='.tmp_',
            suffix='.yaml'
        )
        try:
            with os.fdopen(temp_fd, 'w') as f:
                yaml.dump(data, f, default_flow_style=False, sort_keys=False)
            # Atomic rename (OS-level guarantee)
            shutil.move(temp_path, self.learnings_path)
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    def _backup_before_write(self):
        """Create .bak backup before modifying."""
        if self.learnings_path.exists():
            backup_path = str(self.learnings_path) + '.bak'
            shutil.copy2(self.learnings_path, backup_path)

    def _append_lifecycle_event(self, pattern_id: str, old_status: str, new_status: str):
        """Append status change to JSONL history.

        Args:
            pattern_id: Pattern identifier
            old_status: Previous status
            new_status: New status
        """
        event = {
            'timestamp': datetime.now().isoformat(),
            'event': 'status_change',
            'pattern_id': pattern_id,
            'old_status': old_status,
            'new_status': new_status
        }

        jsonl_path = self.learnings_path.parent / 'global-learnings.jsonl'
        try:
            with open(jsonl_path, 'a') as f:
                f.write(json.dumps(event) + '\n')
        except Exception:
            # Silent failure - don't block on JSONL append errors
            pass


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Manage pattern lifecycle',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Update pattern to IMPLEMENTED
  %(prog)s update --pattern-id PATTERN-001 --status IMPLEMENTED --plan-id plan-9 --iteration 8

  # Get pattern status
  %(prog)s get-status --pattern-id PATTERN-001

  # List all IMPLEMENTED patterns
  %(prog)s list --status IMPLEMENTED
"""
    )

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # update command
    update_parser = subparsers.add_parser('update', help='Update pattern status')
    update_parser.add_argument('--pattern-id', required=True, help='Pattern ID (e.g., PATTERN-001)')
    update_parser.add_argument('--status', required=True,
                              choices=['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED'],
                              help='New status')
    update_parser.add_argument('--plan-id', help='Plan ID for metadata')
    update_parser.add_argument('--iteration', type=int, help='Iteration number')
    update_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml',
                              help='Path to global learnings file (default: .2L/global-learnings.yaml)')

    # get-status command
    status_parser = subparsers.add_parser('get-status', help='Get pattern status')
    status_parser.add_argument('--pattern-id', required=True, help='Pattern ID')
    status_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml',
                              help='Path to global learnings file')

    # list command
    list_parser = subparsers.add_parser('list', help='List patterns')
    list_parser.add_argument('--status',
                            choices=['IDENTIFIED', 'IMPLEMENTED', 'VERIFIED', 'REGRESSED'],
                            help='Filter by status (optional)')
    list_parser.add_argument('--global-learnings', default='.2L/global-learnings.yaml',
                            help='Path to global learnings file')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    try:
        if args.command == 'update':
            manager = PatternLifecycleManager(args.global_learnings)

            metadata = {}
            if args.plan_id:
                metadata['plan_id'] = args.plan_id
            if args.iteration is not None:
                metadata['iteration'] = args.iteration

            manager.update_status(args.pattern_id, args.status, metadata)
            sys.exit(0)

        elif args.command == 'get-status':
            manager = PatternLifecycleManager(args.global_learnings)
            pattern = manager.get_status(args.pattern_id)

            if pattern:
                print(f"Pattern: {pattern['pattern_id']}")
                print(f"Name: {pattern.get('name', 'N/A')}")
                print(f"Status: {pattern.get('status', 'IDENTIFIED')}")
                print(f"Discovered: {pattern.get('discovered_at', 'N/A')}")
                if pattern.get('implemented_at'):
                    print(f"Implemented: {pattern['implemented_at']}")
                if pattern.get('verified_at'):
                    print(f"Verified: {pattern['verified_at']}")
                sys.exit(0)
            else:
                print(f"ERROR: Pattern {args.pattern_id} not found", file=sys.stderr)
                sys.exit(1)

        elif args.command == 'list':
            manager = PatternLifecycleManager(args.global_learnings)
            patterns = manager.list_patterns(args.status)

            if patterns:
                print(f"Found {len(patterns)} pattern(s):")
                for pattern in patterns:
                    status = pattern.get('status', 'IDENTIFIED')
                    name = pattern.get('name', 'N/A')
                    print(f"  {pattern['pattern_id']}: {name} [{status}]")
                sys.exit(0)
            else:
                filter_msg = f" with status {args.status}" if args.status else ""
                print(f"No patterns found{filter_msg}")
                sys.exit(0)

    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    except yaml.YAMLError as e:
        print(f"ERROR: YAML parsing failed: {e}", file=sys.stderr)
        print("  Tip: Check .2L/global-learnings.yaml.bak for backup", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Pattern lifecycle update failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
