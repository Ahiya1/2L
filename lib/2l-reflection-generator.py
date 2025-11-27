#!/usr/bin/env python3
"""
2L Reflection Generator - Create structured reflections from iteration artifacts

Usage:
    python3 2l-reflection-generator.py \
        --iteration-dir .2L/plan-3/iteration-2 \
        --plan-id plan-3 \
        --iteration 2 \
        --output .2L/plan-3/iteration-2/REFLECTION.md \
        --jsonl .2L/global-learnings.jsonl

Environment:
    Runs in meditation space (~/Ahiya/2L) or project directories

Exit Codes:
    0: Success (reflection created)
    1: Error (parsing failed, file missing)
    2: Safety abort (invalid inputs)
"""

import sys
import os
import yaml
import json
import re
import fcntl
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Constants
SCHEMA_VERSION = "1.0"
SIMILARITY_THRESHOLD = 0.8

# Priority weights for categorization
PRIORITY_WEIGHTS = {
    'P1': 3.0,  # Functionality (breaks workflow)
    'P2': 2.0,  # Completeness (missing features)
    'P3': 1.0   # Speed (performance only)
}

# Framework detection keywords
FRAMEWORK_KEYWORDS = [
    'orchestrator', 'explorer', 'builder', 'integrator', 'validator', 'healer',
    'task tool', 'agent spawn', 'agent_start', 'agent_complete',
    '2l-mvp', '2l-improve', '2l-dashboard', 'event logging',
    'pattern detection', 'reflection', 'aggregation'
]

# Framework file path patterns
FRAMEWORK_PATHS = [
    'commands/', 'lib/', 'agents/', 'templates/', '.2L/',
    '2l-', 'lib/2l-', 'templates/'
]

# Project-specific path patterns (exclude from framework issues)
PROJECT_PATHS = [
    'app/', 'src/', 'components/', 'pages/', 'api/',
    'public/', 'styles/', 'utils/', 'hooks/'
]


class ReflectionGenerator:
    """Generate REFLECTION.md from iteration artifacts."""

    def __init__(self, iteration_dir: Path, plan_id: str, iteration: int):
        """
        Initialize reflection generator.

        Args:
            iteration_dir: Path to iteration directory
            plan_id: Plan identifier (e.g., "plan-3")
            iteration: Global iteration number
        """
        self.iteration_dir = iteration_dir
        self.plan_id = plan_id
        self.iteration = iteration
        self.validation_report = iteration_dir / "validation" / "validation-report.md"
        self.learnings_file = iteration_dir / "learnings.yaml"

    def generate(self) -> Dict:
        """
        Generate reflection dictionary.

        Returns:
            Dictionary with reflection data
        """
        # Parse validation report
        validation_data = self.parse_validation_report()

        # Extract framework issues
        framework_issues = self.extract_framework_issues(validation_data)

        # Read learnings.yaml if exists (from healing phase)
        if self.learnings_file.exists():
            healing_issues = self.parse_learnings_yaml()
            framework_issues.extend(healing_issues)

        # Categorize by priority
        categorized_issues = self.categorize_issues(framework_issues)

        # Build reflection data
        reflection = {
            'metadata': {
                'project': validation_data.get('project', '2L-self-improvement'),
                'plan_id': self.plan_id,
                'iteration': self.iteration,
                'status': validation_data.get('status', 'UNKNOWN'),
                'timestamp': datetime.now().isoformat(),
                'schema_version': SCHEMA_VERSION
            },
            'successes': validation_data.get('successes', []),
            'framework_issues': categorized_issues,
            'summary': self.generate_summary(categorized_issues)
        }

        return reflection

    def parse_validation_report(self) -> Dict:
        """
        Parse validation report markdown.

        Returns:
            Dictionary with validation data
        """
        if not self.validation_report.exists():
            print(f"WARNING: Validation report not found: {self.validation_report}",
                  file=sys.stderr)
            return {
                'status': 'UNKNOWN',
                'project': '2L-self-improvement',
                'successes': [],
                'issues': []
            }

        try:
            with open(self.validation_report) as f:
                content = f.read()

            # Extract status
            status_match = re.search(r'\*\*Status:\*\*\s*(\w+)', content) or \
                          re.search(r'## Status\s+\*\*(\w+)\*\*', content)
            status = status_match.group(1) if status_match else 'UNKNOWN'

            # Extract successes (look for "What Went Well" or passed checks)
            successes = []
            went_well_match = re.search(r'## What Went Well\s*\n(.*?)\n##',
                                       content, re.DOTALL)
            if went_well_match:
                for line in went_well_match.group(1).strip().split('\n'):
                    if line.strip().startswith('-') or line.strip().startswith('*'):
                        successes.append(line.strip()[2:].strip())

            # Extract issues from "Issues Summary" section
            issues = []
            issues_section = re.search(r'## Issues Summary\s*\n(.*?)(?:\n##|\Z)',
                                      content, re.DOTALL)
            if issues_section:
                issues = self.parse_issues_section(issues_section.group(1))

            # Also check for critical/major/minor issues subsections
            for severity in ['Critical', 'Major', 'Minor']:
                section_match = re.search(
                    rf'### {severity} Issues.*?\n(.*?)(?:\n###|\n##|\Z)',
                    content, re.DOTALL | re.IGNORECASE
                )
                if section_match:
                    severity_issues = self.parse_issues_section(section_match.group(1))
                    for issue in severity_issues:
                        issue['severity'] = severity.lower()
                    issues.extend(severity_issues)

            return {
                'status': status,
                'project': '2L-self-improvement',
                'successes': successes,
                'issues': issues
            }

        except Exception as e:
            print(f"WARNING: Failed to parse validation report: {e}", file=sys.stderr)
            return {
                'status': 'ERROR',
                'project': '2L-self-improvement',
                'successes': [],
                'issues': []
            }

    def parse_issues_section(self, section_text: str) -> List[Dict]:
        """
        Parse issues from a section of text.

        Args:
            section_text: Text containing issue descriptions

        Returns:
            List of issue dictionaries
        """
        issues = []

        # Pattern for numbered issues with details
        issue_pattern = r'\d+\.\s+\*\*(.+?)\*\*\s*\n\s*-\s*Category:\s*(.+?)\n\s*-\s*Location:\s*(.+?)\n\s*-\s*Impact:\s*(.+?)\n\s*-\s*Root cause:\s*(.+?)\n\s*-\s*Suggested fix:\s*(.+?)(?:\n\n|\n\d+\.|\Z)'

        for match in re.finditer(issue_pattern, section_text, re.DOTALL | re.IGNORECASE):
            issue = {
                'issue': match.group(1).strip(),
                'category': match.group(2).strip(),
                'location': match.group(3).strip(),
                'impact': match.group(4).strip(),
                'root_cause': match.group(5).strip(),
                'suggested_fix': match.group(6).strip(),
                'severity': 'medium'  # Default, may be overridden
            }
            issues.append(issue)

        return issues

    def parse_learnings_yaml(self) -> List[Dict]:
        """
        Parse learnings.yaml from healing phase.

        Returns:
            List of framework issues from learnings
        """
        try:
            with open(self.learnings_file) as f:
                learnings_data = yaml.safe_load(f)

            issues = []
            for learning in learnings_data.get('learnings', []):
                issue = {
                    'issue': learning.get('issue', 'Unknown issue'),
                    'category': learning.get('category', 'functionality'),
                    'root_cause': learning.get('root_cause', 'Unknown'),
                    'suggested_fix': learning.get('solution', 'Unknown'),
                    'severity': learning.get('severity', 'medium'),
                    'location': ', '.join(learning.get('affected_files', [])),
                    'impact': learning.get('impact', 'Unknown impact')
                }
                issues.append(issue)

            return issues

        except Exception as e:
            print(f"WARNING: Failed to parse learnings.yaml: {e}", file=sys.stderr)
            return []

    def extract_framework_issues(self, validation_data: Dict) -> List[Dict]:
        """
        Extract issues that are framework-related.

        Args:
            validation_data: Parsed validation data

        Returns:
            List of framework issues
        """
        framework_issues = []

        for issue in validation_data.get('issues', []):
            if self.is_framework_issue(issue):
                framework_issues.append(issue)

        return framework_issues

    def is_framework_issue(self, issue: Dict) -> bool:
        """
        Determine if an issue is related to 2L framework.

        Uses multi-heuristic approach:
        1. File path matching (commands/, lib/, etc.)
        2. Keyword matching in root cause/issue text
        3. Conservative bias (prefer false negatives)

        Args:
            issue: Issue dictionary

        Returns:
            True if framework issue, False otherwise
        """
        # Check file paths
        location = issue.get('location', '').lower()
        for framework_path in FRAMEWORK_PATHS:
            if framework_path.lower() in location:
                return True

        # Exclude project-specific paths
        for project_path in PROJECT_PATHS:
            if project_path.lower() in location:
                return False

        # Check keywords in issue text and root cause
        issue_text = (issue.get('issue', '') + ' ' +
                     issue.get('root_cause', '') + ' ' +
                     issue.get('impact', '')).lower()

        for keyword in FRAMEWORK_KEYWORDS:
            if keyword.lower() in issue_text:
                return True

        # Conservative: if uncertain, mark as non-framework
        return False

    def categorize_issues(self, issues: List[Dict]) -> List[Dict]:
        """
        Categorize issues by priority (P1/P2/P3).

        Args:
            issues: List of issue dictionaries

        Returns:
            List of issues with priority field added
        """
        categorized = []

        for issue in issues:
            priority = self.categorize_by_priority(issue)
            issue['priority'] = priority
            categorized.append(issue)

        # Sort by priority (P1 first, then P2, then P3)
        categorized.sort(key=lambda x: PRIORITY_WEIGHTS.get(x['priority'], 0),
                        reverse=True)

        return categorized

    def categorize_by_priority(self, issue: Dict) -> str:
        """
        Categorize single issue by priority.

        P1 (Functionality): Breaks existing workflow
        P2 (Completeness): Missing features or gaps
        P3 (Speed): Performance issues only

        Args:
            issue: Issue dictionary

        Returns:
            Priority string (P1/P2/P3)
        """
        issue_text = (issue.get('issue', '') + ' ' +
                     issue.get('root_cause', '') + ' ' +
                     issue.get('impact', '')).lower()

        # P1 keywords (functionality breaks)
        p1_keywords = ['fails', 'crashes', 'error', 'cannot', 'blocking',
                       'breaks', 'critical', 'broken', 'does not work']
        for keyword in p1_keywords:
            if keyword in issue_text:
                return 'P1'

        # P3 keywords (performance only)
        p3_keywords = ['slow', 'performance', 'timeout', 'takes too long',
                       'optimization', 'faster', 'latency']
        for keyword in p3_keywords:
            if keyword in issue_text:
                return 'P3'

        # P2 keywords (completeness)
        p2_keywords = ['missing', 'lacks', 'not implemented', 'incomplete',
                       'should have', 'could have', 'enhancement']
        for keyword in p2_keywords:
            if keyword in issue_text:
                return 'P2'

        # Check severity field
        severity = issue.get('severity', 'medium').lower()
        if severity in ['critical', 'high']:
            return 'P1'
        elif severity in ['low']:
            return 'P3'

        # Default to P2 (completeness)
        return 'P2'

    def generate_summary(self, issues: List[Dict]) -> Dict:
        """
        Generate summary statistics.

        Args:
            issues: List of categorized issues

        Returns:
            Summary dictionary
        """
        p1_count = sum(1 for issue in issues if issue.get('priority') == 'P1')
        p2_count = sum(1 for issue in issues if issue.get('priority') == 'P2')
        p3_count = sum(1 for issue in issues if issue.get('priority') == 'P3')

        # Determine next steps based on status
        if p1_count > 0:
            next_steps = f"Address {p1_count} critical functionality issue(s) before next iteration"
        elif p2_count > 0:
            next_steps = f"Consider implementing {p2_count} completeness improvement(s)"
        elif p3_count > 0:
            next_steps = f"Optimize {p3_count} performance issue(s) as time permits"
        else:
            next_steps = "No framework issues detected - continue iteration cycle"

        return {
            'total': len(issues),
            'p1_count': p1_count,
            'p2_count': p2_count,
            'p3_count': p3_count,
            'next_steps': next_steps
        }


def generate_reflection_markdown(reflection: Dict, template_path: Path) -> str:
    """
    Generate reflection markdown from template.

    Args:
        reflection: Reflection data dictionary
        template_path: Path to reflection template

    Returns:
        Formatted markdown string
    """
    # Read template
    with open(template_path) as f:
        template = f.read()

    # Format successes
    successes_text = '\n'.join(f"- {s}" for s in reflection['successes']) if reflection['successes'] else "- Iteration completed"

    # Format framework issues
    if reflection['framework_issues']:
        issues_text = ""
        for idx, issue in enumerate(reflection['framework_issues'], 1):
            category = issue.get('category', 'Unknown')
            priority = issue.get('priority', 'P2')
            issues_text += f"### Issue {idx}: {category} - {priority}\n\n"
            issues_text += f"**Problem:** {issue.get('issue', 'Unknown')}\n\n"
            issues_text += f"**Root Cause:** {issue.get('root_cause', 'Unknown')}\n\n"
            issues_text += f"**Suggested Fix:** {issue.get('suggested_fix', 'Unknown')}\n\n"
            issues_text += f"**Affected Components:** {issue.get('location', 'Unknown')}\n\n"
    else:
        issues_text = "No framework issues detected in this iteration.\n"

    # Replace placeholders
    output = template.replace('{PROJECT_NAME}', reflection['metadata']['project'])
    output = output.replace('{PLAN_ID}', reflection['metadata']['plan_id'])
    output = output.replace('{ITERATION_NUMBER}', str(reflection['metadata']['iteration']))
    output = output.replace('{VALIDATION_STATUS}', reflection['metadata']['status'])
    output = output.replace('{TIMESTAMP}', reflection['metadata']['timestamp'])
    output = output.replace('{SUCCESSES}', successes_text)
    output = output.replace('{FRAMEWORK_ISSUES}', issues_text)
    output = output.replace('{ISSUE_COUNT}', str(reflection['summary']['total']))
    output = output.replace('{P1_COUNT}', str(reflection['summary']['p1_count']))
    output = output.replace('{P2_COUNT}', str(reflection['summary']['p2_count']))
    output = output.replace('{P3_COUNT}', str(reflection['summary']['p3_count']))
    output = output.replace('{LEARNING_COUNT}', str(len(reflection['framework_issues'])))
    output = output.replace('{NEXT_STEPS}', reflection['summary']['next_steps'])

    return output


def append_to_jsonl(learning: Dict, jsonl_path: Path) -> None:
    """
    Append learning to JSONL file with file locking.

    Args:
        learning: Learning dictionary
        jsonl_path: Path to .jsonl file

    Raises:
        IOError: If append fails
    """
    # Ensure parent directory exists
    jsonl_path.parent.mkdir(parents=True, exist_ok=True)

    # Add timestamp if not present
    if 'timestamp' not in learning:
        learning['timestamp'] = datetime.now().isoformat()

    # Open in append mode with locking
    with open(jsonl_path, 'a') as f:
        try:
            # Acquire exclusive lock (prevents concurrent writes)
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)

            # Write single JSON line
            f.write(json.dumps(learning, ensure_ascii=False) + '\n')
            f.flush()  # Ensure written to disk

        finally:
            # Release lock
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description='Generate iteration reflection from execution artifacts',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate reflection for iteration 2
  %(prog)s --iteration-dir .2L/plan-3/iteration-2 \\
           --plan-id plan-3 \\
           --iteration 2 \\
           --output .2L/plan-3/iteration-2/REFLECTION.md \\
           --jsonl .2L/global-learnings.jsonl

  # Dry run (don't write files)
  %(prog)s --iteration-dir .2L/plan-3/iteration-2 \\
           --plan-id plan-3 \\
           --iteration 2 \\
           --dry-run
"""
    )

    parser.add_argument('--iteration-dir', required=True,
                        help='Path to iteration directory')
    parser.add_argument('--plan-id', required=True,
                        help='Plan ID (e.g., plan-3)')
    parser.add_argument('--iteration', type=int, required=True,
                        help='Global iteration number')
    parser.add_argument('--output',
                        help='Path to output REFLECTION.md')
    parser.add_argument('--jsonl',
                        help='Path to global-learnings.jsonl')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show output without writing files')

    args = parser.parse_args()

    try:
        # Validate inputs
        iteration_dir = Path(args.iteration_dir)
        if not iteration_dir.exists():
            print(f"ERROR: Iteration directory not found: {iteration_dir}",
                  file=sys.stderr)
            sys.exit(2)

        if not iteration_dir.is_dir():
            print(f"ERROR: Path is not a directory: {iteration_dir}",
                  file=sys.stderr)
            sys.exit(2)

        # Generate reflection
        generator = ReflectionGenerator(iteration_dir, args.plan_id, args.iteration)
        reflection = generator.generate()

        # Find template (try multiple locations)
        template_path = None
        for base in [Path.home() / '.claude', Path('/home/ahiya/.claude')]:
            candidate = base / 'templates' / 'reflection-template.md'
            if candidate.exists():
                template_path = candidate
                break

        if not template_path:
            print("ERROR: reflection-template.md not found", file=sys.stderr)
            sys.exit(1)

        # Generate markdown
        markdown = generate_reflection_markdown(reflection, template_path)

        # Write output
        if args.dry_run:
            print("=== DRY RUN ===")
            print(f"Would write to: {args.output}")
            print(markdown)
            print(f"\nWould append {len(reflection['framework_issues'])} learnings to: {args.jsonl}")
        else:
            # Write REFLECTION.md
            if args.output:
                output_path = Path(args.output)
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'w') as f:
                    f.write(markdown)
                print(f"✅ Reflection created: {output_path}")

            # Append to JSONL
            if args.jsonl and reflection['framework_issues']:
                jsonl_path = Path(args.jsonl)
                for idx, issue in enumerate(reflection['framework_issues'], 1):
                    learning = {
                        'learning_id': f"{args.plan_id}-iter-{args.iteration}-learning-{idx:03d}",
                        'project': reflection['metadata']['project'],
                        'plan_id': args.plan_id,
                        'iteration': args.iteration,
                        'category': issue.get('category', 'functionality'),
                        'priority': issue.get('priority', 'P2'),
                        'issue': issue.get('issue', 'Unknown'),
                        'severity': issue.get('severity', 'medium'),
                        'root_cause': issue.get('root_cause', 'Unknown'),
                        'suggested_fix': issue.get('suggested_fix', 'Unknown'),
                        'affected_files': [issue.get('location', 'Unknown')],
                        'pattern_id': None
                    }
                    append_to_jsonl(learning, jsonl_path)

                print(f"✅ Appended {len(reflection['framework_issues'])} learnings to: {jsonl_path}")

        sys.exit(0)

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
