#!/usr/bin/env python3
"""
2L Vision Generator - Auto-generate improvement visions from patterns

Usage:
    python3 2l-vision-generator.py --pattern-json pattern.json \
                                   --template templates/improvement-vision.md \
                                   --output .2L/plan-6/vision.md \
                                   --plan-id plan-6 \
                                   --exploration-dir .2L/plan-6/exploration
"""

import json
import argparse
import sys
import re
import os
from datetime import datetime


def format_cross_project_evidence(pattern):
    """
    Format cross-project evidence for vision display.

    Args:
        pattern: Pattern dictionary with source_projects and evidence_count

    Returns:
        Formatted string for vision markdown
    """
    source_projects = pattern.get('source_projects', [])
    evidence_count = pattern.get('evidence_count', 0)

    if len(source_projects) == 0:
        return "Evidence: None (legacy pattern)"

    if len(source_projects) == 1:
        return f"Evidence: {evidence_count} occurrence(s) in {source_projects[0]}"

    # Multiple projects - show cross-project evidence
    confidence = "HIGH" if len(source_projects) >= 3 else "MEDIUM"
    projects_str = ", ".join(source_projects)

    return f"""Cross-Project Evidence:
- **Confidence:** {confidence} ({len(source_projects)} projects affected)
- **Projects:** {projects_str}
- **Total occurrences:** {evidence_count}
- **Impact:** Framework issue detected across multiple production projects"""


def infer_affected_components(root_cause):
    """
    Infer which agents/commands to modify based on root cause keywords.

    Args:
        root_cause: Root cause string from pattern

    Returns:
        components: List of component descriptions
    """
    components = []
    root_lower = root_cause.lower()

    # Pattern matching on root cause keywords
    if 'tsconfig' in root_lower or 'path' in root_lower or 'import' in root_lower:
        components.append('agents/2l-planner.md - Add tsconfig validation step before builders start')

    if 'duplicate' in root_lower:
        components.append('agents/2l-iplanner.md - Add duplicate file detection across zones')

    if 'integration' in root_lower or 'conflict' in root_lower:
        components.append('agents/2l-integrator.md - Enhanced conflict detection')

    if 'validation' in root_lower or 'test' in root_lower:
        components.append('agents/2l-validator.md - Improve validation checks')

    if 'builder' in root_lower:
        components.append('agents/2l-builder.md - Add safety checks')

    # Default fallback
    if not components:
        components.append('TBD - Requires manual analysis of root cause during planning')

    return components


def generate_improvement_vision(pattern, plan_id, template_path, exploration_dir=None):
    """
    Generate vision.md from pattern using template with optional exploration context.

    Args:
        pattern: Pattern dict from global-learnings.yaml
        plan_id: Plan ID for this improvement (e.g., "plan-6")
        template_path: Path to vision template
        exploration_dir: Optional path to exploration reports directory

    Returns:
        vision_content: Generated vision markdown
    """
    # Read template
    with open(template_path, 'r') as f:
        template = f.read()

    # Extract exploration context if available
    exploration_context = ""
    if exploration_dir and os.path.exists(exploration_dir):
        exploration_context = _read_exploration_reports(exploration_dir)

    # Extract iteration metadata for averages
    iteration_metadata = pattern.get('iteration_metadata', {})
    avg_healing_rounds = iteration_metadata.get('healing_rounds', 0)
    avg_files_modified = iteration_metadata.get('files_modified', 0)
    avg_duration = iteration_metadata.get('duration_seconds', 0)

    # Recurrence risk based on occurrences
    recurrence_risk = 'high' if pattern['occurrences'] >= 3 else 'medium'

    # Cross-project evidence
    cross_project_evidence = format_cross_project_evidence(pattern)

    # Variable substitution
    replacements = {
        '{PATTERN_NAME}': pattern['name'],
        '{ISO_TIMESTAMP}': datetime.now().isoformat(),
        '{PLAN_ID}': plan_id,
        '{PATTERN_ID}': pattern['pattern_id'],
        '{OCCURRENCES}': str(pattern['occurrences']),
        '{PROJECT_COUNT}': str(len(pattern['projects'])),
        '{PATTERN_ISSUE_DESCRIPTION}': pattern['name'],
        '{PROJECT_LIST}': '\n'.join(f"- {project}" for project in pattern['projects']),
        '{DISCOVERED_IN}': pattern.get('discovered_in', 'unknown'),
        '{SEVERITY}': pattern['severity'].upper(),
        '{RECURRENCE_RISK}': recurrence_risk,
        '{PATTERN_ROOT_CAUSE}': pattern['root_cause'],
        '{SOURCE_LEARNINGS_LIST}': '\n'.join(f"- {learning_id}" for learning_id in pattern.get('source_learnings', [])),
        '{AVG_HEALING_ROUNDS}': f"{avg_healing_rounds:.1f}",
        '{AVG_FILES_MODIFIED}': f"{avg_files_modified:.1f}",
        '{AVG_DURATION_SECONDS}': f"{avg_duration:.0f}",
        '{PATTERN_PROPOSED_SOLUTION}': pattern['proposed_solution'],
        '{SPECIFIC_IMPLEMENTATION}': pattern['proposed_solution'],  # Reuse solution as implementation
        '{DISCOVERED_AT}': pattern.get('discovered_at', 'unknown'),
        '{SOURCE_LEARNING_IDS}': ', '.join(pattern.get('source_learnings', [])),
        '{CROSS_PROJECT_EVIDENCE}': cross_project_evidence,  # NEW: Cross-project evidence
    }

    # Infer affected components
    affected_components = infer_affected_components(pattern['root_cause'])
    replacements['{AFFECTED_COMPONENTS_LIST}'] = '\n'.join(f"- {comp}" for comp in affected_components)
    replacements['{INFERRED_COMPONENTS_TO_MODIFY}'] = '\n'.join(f"- {comp}" for comp in affected_components)

    # Affected files (use affected_files from pattern if available)
    affected_files = pattern.get('affected_files', ['See source learnings for file details'])
    replacements['{AFFECTED_FILES_FROM_PATTERN}'] = '\n'.join(f"- {file_path}" for file_path in affected_files)

    # Occurrence details
    occurrence_details = '\n'.join(
        f"- Project: {project}, Learning ID: {learning_id}"
        for project, learning_id in zip(pattern['projects'], pattern.get('source_learnings', []))
    )
    replacements['{OCCURRENCE_DETAILS}'] = occurrence_details

    # Exploration context
    replacements['{EXPLORATION_CONTEXT}'] = exploration_context or "No exploration data available (explorers not run)"

    # Apply all replacements
    vision_content = template
    for placeholder, value in replacements.items():
        vision_content = vision_content.replace(placeholder, value)

    # Quality validation: check for unreplaced placeholders
    if '{' in vision_content and '}' in vision_content:
        # Find unreplaced placeholders
        unreplaced = re.findall(r'\{[A-Z_]+\}', vision_content)
        if unreplaced:
            print(f"WARNING: Unreplaced placeholders detected: {unreplaced}", file=sys.stderr)

    return vision_content


def _read_exploration_reports(exploration_dir):
    """
    Read all explorer reports and extract key sections.

    Args:
        exploration_dir: Path to directory containing explorer reports

    Returns:
        context: Formatted markdown string with exploration findings
    """
    context = "\n## Exploration Findings\n\n"

    for i in range(1, 4):
        report_path = os.path.join(exploration_dir, f"explorer-{i}-report.md")

        if not os.path.exists(report_path):
            context += f"### Explorer {i}\n⚠️ Report not found\n\n"
            continue

        try:
            with open(report_path, 'r') as f:
                report_content = f.read()

            context += _extract_key_sections(report_content, i)
        except Exception as e:
            context += f"### Explorer {i}\n⚠️ Error reading report: {e}\n\n"

    return context


def _extract_key_sections(markdown_text, explorer_id):
    """
    Extract relevant sections from explorer report.

    Args:
        markdown_text: Full markdown content of explorer report
        explorer_id: Explorer number (1, 2, or 3)

    Returns:
        output: Formatted markdown with extracted sections
    """
    output = f"### Explorer {explorer_id} Findings\n\n"

    # Sections to extract
    sections = ["Executive Summary", "Integration Points", "Recommendations", "Affected Components"]

    for section in sections:
        # Regex pattern: Match section header until next ## or end of file
        pattern = rf"## {section}.*?(?=\n## |\Z)"
        match = re.search(pattern, markdown_text, re.DOTALL)

        if match:
            section_content = match.group(0)
            # Truncate if too long (keep first 500 chars to prevent vision bloat)
            if len(section_content) > 500:
                section_content = section_content[:500] + "\n...(truncated)"
            output += section_content + "\n\n"

    return output


def main():
    parser = argparse.ArgumentParser(description='Generate improvement vision from pattern')
    parser.add_argument('--pattern-json', required=True, help='Path to pattern JSON file')
    parser.add_argument('--template', required=True, help='Path to vision template')
    parser.add_argument('--output', required=True, help='Output path for generated vision')
    parser.add_argument('--plan-id', required=True, help='Plan ID (e.g., plan-6)')
    parser.add_argument('--exploration-dir', help='Path to exploration reports directory')

    args = parser.parse_args()

    # Load pattern
    with open(args.pattern_json, 'r') as f:
        pattern = json.load(f)

    # Generate vision
    vision_content = generate_improvement_vision(pattern, args.plan_id, args.template, args.exploration_dir)

    # Write vision
    with open(args.output, 'w') as f:
        f.write(vision_content)

    print(f"Vision generated: {args.output}")
    print(f"   Pattern: {pattern['pattern_id']} - {pattern['name']}")
    print(f"   Severity: {pattern['severity']} | Occurrences: {pattern['occurrences']}")


if __name__ == '__main__':
    main()
