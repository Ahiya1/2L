#!/usr/bin/env python3
"""
2L YAML Helpers - Learning aggregation and atomic writes

This library provides utilities for safely manipulating YAML files used in
the 2L learning capture system, with emphasis on atomic writes to prevent
corruption of global state.
"""

import os
import sys
import tempfile
import shutil
import yaml
import argparse
from datetime import datetime


def atomic_write_yaml(file_path, data):
    """
    Write YAML data atomically to prevent corruption.
    Uses temp file + rename for atomic operation.

    Args:
        file_path: Target YAML file path
        data: Python dict to write as YAML

    Raises:
        Exception: If write fails (temp file cleaned up automatically)
    """
    # Create temp file in same directory (ensures same filesystem)
    dir_path = os.path.dirname(file_path) or '.'
    temp_fd, temp_path = tempfile.mkstemp(
        dir=dir_path,
        prefix='.tmp_',
        suffix='.yaml'
    )

    try:
        # Write YAML to temp file
        with os.fdopen(temp_fd, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

        # Atomic rename (replaces existing file)
        shutil.move(temp_path, file_path)

    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise e


def backup_before_write(file_path):
    """
    Create .bak backup of file before modifying.

    Args:
        file_path: File to backup

    Returns:
        backup_path: Path to backup file, or None if file doesn't exist
    """
    if os.path.exists(file_path):
        backup_path = file_path + '.bak'
        shutil.copy2(file_path, backup_path)
        return backup_path
    return None


def generate_pattern_id(existing_patterns):
    """
    Generate next pattern ID: PATTERN-NNN

    Args:
        existing_patterns: List of existing pattern dicts

    Returns:
        pattern_id: Next ID string (e.g., "PATTERN-001")
    """
    # Find highest existing ID
    max_id = 0
    for pattern in existing_patterns:
        pattern_id = pattern.get('pattern_id', 'PATTERN-000')
        # Extract number from PATTERN-NNN
        try:
            num = int(pattern_id.split('-')[1])
            max_id = max(max_id, num)
        except (IndexError, ValueError):
            continue

    # Next ID
    next_id = max_id + 1
    return f"PATTERN-{next_id:03d}"


def find_similar_pattern(existing_patterns, new_pattern):
    """
    Find similar pattern in existing patterns (conservative similarity).

    Args:
        existing_patterns: List of existing pattern dicts
        new_pattern: New pattern dict to check

    Returns:
        Existing pattern dict if similar, None otherwise
    """
    for pattern in existing_patterns:
        # Exact match on root_cause (conservative)
        if pattern['root_cause'] == new_pattern['root_cause']:
            # Also check severity matches
            if pattern['severity'] == new_pattern['severity']:
                return pattern
    return None


def merge_learnings(iteration_learnings_path, global_learnings_path,
                   discovered_in, duration_seconds, healing_rounds, files_modified):
    """
    Merge iteration learnings into global learnings file.

    Args:
        iteration_learnings_path: Path to iteration learnings.yaml
        global_learnings_path: Path to global-learnings.yaml
        discovered_in: Iteration identifier (e.g., "plan-3-iter-2")
        duration_seconds: Iteration duration
        healing_rounds: Number of healing rounds
        files_modified: Number of files modified
    """
    # Read iteration learnings
    with open(iteration_learnings_path, 'r') as f:
        iteration_data = yaml.safe_load(f)

    # Read or initialize global learnings
    if os.path.exists(global_learnings_path):
        # Backup before modification
        backup_before_write(global_learnings_path)

        with open(global_learnings_path, 'r') as f:
            global_data = yaml.safe_load(f)
    else:
        # Initialize new global learnings file
        global_data = {
            'schema_version': '1.0',
            'aggregated_at': datetime.now().isoformat(),
            'total_projects': 0,
            'total_learnings': 0,
            'patterns': []
        }

    # Merge iteration learnings
    project_name = iteration_data.get('project', 'unknown')

    for learning in iteration_data.get('learnings', []):
        # Convert to global pattern format
        pattern = {
            'pattern_id': generate_pattern_id(global_data['patterns']),
            'name': learning['issue'][:60],  # Truncate for readability
            'occurrences': 1,
            'projects': [project_name],
            'severity': learning['severity'],
            'root_cause': learning['root_cause'],
            'proposed_solution': learning['solution'],
            'status': 'IDENTIFIED',
            'discovered_in': discovered_in,
            'discovered_at': datetime.now().isoformat(),
            'source_learnings': [learning['id']],
            'iteration_metadata': {
                'duration_seconds': duration_seconds,
                'healing_rounds': healing_rounds,
                'files_modified': files_modified
            }
        }

        # Check for similar patterns (basic similarity)
        existing = find_similar_pattern(global_data['patterns'], pattern)

        if existing:
            # Merge into existing pattern
            existing['occurrences'] += 1
            if project_name not in existing['projects']:
                existing['projects'].append(project_name)
            existing['source_learnings'].append(learning['id'])
        else:
            # Add new pattern
            global_data['patterns'].append(pattern)
            global_data['total_learnings'] += 1

    # Update metadata
    global_data['aggregated_at'] = datetime.now().isoformat()

    # Track unique projects
    all_projects = set()
    for pattern in global_data['patterns']:
        all_projects.update(pattern.get('projects', []))
    global_data['total_projects'] = len(all_projects)

    # Atomic write
    atomic_write_yaml(global_learnings_path, global_data)

    print(f"Merged {len(iteration_data.get('learnings', []))} learnings into global knowledge base")


# Main CLI
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='2L YAML Helpers')
    parser.add_argument('command', choices=['merge_learnings'])
    parser.add_argument('--iteration-learnings', required=True,
                       help='Path to iteration learnings.yaml')
    parser.add_argument('--global-learnings', required=True,
                       help='Path to global-learnings.yaml')
    parser.add_argument('--discovered-in', required=True,
                       help='Iteration identifier (e.g., plan-3-iter-2)')
    parser.add_argument('--duration', type=int, required=True,
                       help='Iteration duration in seconds')
    parser.add_argument('--healing-rounds', type=int, required=True,
                       help='Number of healing rounds')
    parser.add_argument('--files-modified', type=int, required=True,
                       help='Number of files modified')

    args = parser.parse_args()

    if args.command == 'merge_learnings':
        try:
            merge_learnings(
                args.iteration_learnings,
                args.global_learnings,
                args.discovered_in,
                args.duration,
                args.healing_rounds,
                args.files_modified
            )
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
