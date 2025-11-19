#!/usr/bin/env python3
"""
2L Pattern Detector - Identify recurring patterns from global learnings

Usage:
    python3 2l-pattern-detector.py --global-learnings .2L/global-learnings.yaml \
                                   --min-occurrences 2 \
                                   --min-severity medium \
                                   --output patterns.json
"""

import yaml
import json
import argparse
import sys
from datetime import datetime


def calculate_impact_score(pattern):
    """
    Calculate impact score for pattern ranking.

    Formula: severity_weight × occurrences × recurrence_factor

    Args:
        pattern: Pattern dict with severity, occurrences, projects fields

    Returns:
        impact_score: Float score (higher = more impactful)
    """
    # Severity weights
    severity_weights = {
        'critical': 10,
        'medium': 5,
        'low': 1
    }

    severity = pattern.get('severity', 'low')
    severity_weight = severity_weights.get(severity, 1)

    # Occurrences
    occurrences = pattern.get('occurrences', 1)

    # Recurrence factor (higher if multiple projects)
    projects = pattern.get('projects', [])
    recurrence_factor = 1.5 if len(projects) > 1 else 1.0

    # Calculate score
    impact_score = severity_weight * occurrences * recurrence_factor

    return impact_score


def detect_recurring_patterns(global_learnings_path, min_occurrences=2, min_severity='medium'):
    """
    Detect recurring patterns from global learnings.

    Args:
        global_learnings_path: Path to global-learnings.yaml
        min_occurrences: Minimum occurrences to consider pattern recurring (default: 2)
        min_severity: Minimum severity ('critical', 'medium', 'low') (default: 'medium')

    Returns:
        patterns: List of pattern dicts, sorted by impact score (descending)
    """
    # Read global learnings
    with open(global_learnings_path, 'r') as f:
        global_data = yaml.safe_load(f)

    all_patterns = global_data.get('patterns', [])

    # Filter by status (only IDENTIFIED)
    identified_patterns = [
        p for p in all_patterns
        if p.get('status', 'IDENTIFIED') == 'IDENTIFIED'
    ]

    # Filter by minimum occurrences
    recurring_patterns = [
        p for p in identified_patterns
        if p.get('occurrences', 0) >= min_occurrences
    ]

    # Filter by minimum severity
    severity_order = {'critical': 3, 'medium': 2, 'low': 1}
    min_severity_level = severity_order.get(min_severity, 2)

    filtered_patterns = [
        p for p in recurring_patterns
        if severity_order.get(p.get('severity', 'low'), 1) >= min_severity_level
    ]

    # Calculate impact score for each pattern
    for pattern in filtered_patterns:
        pattern['impact_score'] = calculate_impact_score(pattern)

    # Sort by impact score (descending), then by pattern_id (for tie-breaking)
    sorted_patterns = sorted(
        filtered_patterns,
        key=lambda p: (-p['impact_score'], p.get('pattern_id', '')),
        reverse=False  # False because we're using negative impact_score for descending
    )

    return sorted_patterns


def main():
    parser = argparse.ArgumentParser(description='Detect recurring patterns from global learnings')
    parser.add_argument('--global-learnings', required=True, help='Path to global-learnings.yaml')
    parser.add_argument('--min-occurrences', type=int, default=2, help='Minimum occurrences (default: 2)')
    parser.add_argument('--min-severity', default='medium', help='Minimum severity (critical/medium/low, default: medium)')
    parser.add_argument('--output', default='-', help='Output file ("-" for stdout, default: stdout)')

    args = parser.parse_args()

    try:
        # Detect patterns
        patterns = detect_recurring_patterns(
            args.global_learnings,
            min_occurrences=args.min_occurrences,
            min_severity=args.min_severity
        )

        # Output as JSON
        output_data = {
            'patterns_found': len(patterns),
            'min_occurrences': args.min_occurrences,
            'min_severity': args.min_severity,
            'detected_at': datetime.now().isoformat(),
            'patterns': patterns
        }

        if args.output == '-':
            print(json.dumps(output_data, indent=2))
        else:
            with open(args.output, 'w') as f:
                json.dump(output_data, f, indent=2)
            print(f"Patterns written to {args.output}", file=sys.stderr)

    except FileNotFoundError as e:
        print(f"ERROR: Global learnings file not found: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Pattern detection failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
