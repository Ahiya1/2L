#!/usr/bin/env python3
"""
Unit tests for 2L Reflection Aggregator
"""

import unittest
import tempfile
import json
import yaml
from pathlib import Path
import sys

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import aggregator (dynamic import due to hyphen in filename)
import importlib.util
_aggregator_path = Path(__file__).parent / "2l-reflection-aggregator.py"
_spec = importlib.util.spec_from_file_location("aggregator", _aggregator_path)
aggregator = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(aggregator)

ReflectionAggregator = aggregator.ReflectionAggregator
read_jsonl = aggregator.read_jsonl
load_patterns = aggregator.load_patterns


class TestSimilarityCalculation(unittest.TestCase):
    """Test fuzzy similarity calculation."""

    def setUp(self):
        self.agg = ReflectionAggregator(similarity_threshold=0.8)

    def test_identical_strings(self):
        """Identical strings should return 1.0."""
        similarity = self.agg.calculate_similarity(
            "Missing exploration phase",
            "Missing exploration phase"
        )
        self.assertEqual(similarity, 1.0)

    def test_case_insensitive(self):
        """Case differences should not affect similarity."""
        similarity = self.agg.calculate_similarity(
            "Missing Exploration Phase",
            "missing exploration phase"
        )
        self.assertEqual(similarity, 1.0)

    def test_very_similar(self):
        """Very similar strings should be >= 0.8."""
        similarity = self.agg.calculate_similarity(
            "Missing exploration before vision",
            "No exploration before creating vision"
        )
        # This should be moderately similar but not identical
        self.assertGreater(similarity, 0.5)
        self.assertLess(similarity, 0.9)

    def test_completely_different(self):
        """Completely different strings should be low similarity."""
        similarity = self.agg.calculate_similarity(
            "Missing exploration phase",
            "YAML parsing error"
        )
        self.assertLess(similarity, 0.5)

    def test_whitespace_normalization(self):
        """Extra whitespace should be normalized."""
        similarity = self.agg.calculate_similarity(
            "  Missing exploration  ",
            "Missing exploration"
        )
        self.assertEqual(similarity, 1.0)


class TestPatternMatching(unittest.TestCase):
    """Test best match finding."""

    def setUp(self):
        self.agg = ReflectionAggregator(similarity_threshold=0.8)

    def test_no_patterns_returns_none(self):
        """Empty pattern list should return None."""
        learning = {"root_cause": "Test issue", "category": "functionality"}
        best_match, score = self.agg.find_best_match(learning, [])
        self.assertIsNone(best_match)
        self.assertEqual(score, 0.0)

    def test_exact_match_found(self):
        """Exact match should return pattern and score 1.0."""
        learning = {
            "root_cause": "Missing exploration phase",
            "category": "functionality"
        }
        patterns = [
            {
                "pattern_id": "PATTERN-001",
                "root_cause": "Missing exploration phase",
                "category": "functionality",
            }
        ]
        best_match, score = self.agg.find_best_match(learning, patterns)
        self.assertIsNotNone(best_match)
        self.assertEqual(best_match["pattern_id"], "PATTERN-001")
        self.assertEqual(score, 1.0)

    def test_different_category_ignored(self):
        """Patterns in different category should not match."""
        learning = {
            "root_cause": "Missing exploration phase",
            "category": "functionality"
        }
        patterns = [
            {
                "pattern_id": "PATTERN-001",
                "root_cause": "Missing exploration phase",
                "category": "speed",  # Different category
            }
        ]
        best_match, score = self.agg.find_best_match(learning, patterns)
        self.assertIsNone(best_match)

    def test_below_threshold_returns_none(self):
        """Match below threshold should return None."""
        learning = {
            "root_cause": "Missing exploration phase",
            "category": "functionality"
        }
        patterns = [
            {
                "pattern_id": "PATTERN-001",
                "root_cause": "YAML parsing error",  # Completely different
                "category": "functionality",
            }
        ]
        best_match, score = self.agg.find_best_match(learning, patterns)
        self.assertIsNone(best_match)


class TestPatternCreation(unittest.TestCase):
    """Test new pattern creation."""

    def setUp(self):
        self.agg = ReflectionAggregator()

    def test_create_pattern_from_learning(self):
        """New pattern should be created correctly."""
        learning = {
            "learning_id": "plan-9-iter-9-learning-001",
            "project": "TestProject",
            "plan_id": "plan-9",
            "iteration": 9,
            "category": "functionality",
            "priority": "P1",
            "issue": "Missing exploration before vision",
            "severity": "medium",
            "root_cause": "No exploration phase in /2l-improve",
            "suggested_fix": "Add exploration step",
            "affected_files": ["commands/2l-improve.md"],
            "timestamp": "2025-11-27T04:00:00Z",
        }
        existing_patterns = []

        pattern = self.agg.create_new_pattern(learning, existing_patterns)

        self.assertEqual(pattern["pattern_id"], "PATTERN-001")
        self.assertEqual(pattern["occurrences"], 1)
        self.assertEqual(pattern["projects"], ["TestProject"])
        self.assertEqual(pattern["severity"], "medium")
        self.assertEqual(pattern["category"], "functionality")
        self.assertEqual(pattern["status"], "IDENTIFIED")
        self.assertIn("plan-9-iter-9-learning-001", pattern["source_learnings"])

    def test_pattern_id_increments(self):
        """Pattern IDs should increment sequentially."""
        learning = {
            "learning_id": "test-001",
            "project": "Test",
            "issue": "Test issue",
            "severity": "low",
            "category": "functionality",
            "root_cause": "Test cause",
            "suggested_fix": "Test fix",
            "affected_files": [],
        }
        existing_patterns = [
            {"pattern_id": "PATTERN-001"},
            {"pattern_id": "PATTERN-002"},
        ]

        pattern = self.agg.create_new_pattern(learning, existing_patterns)
        self.assertEqual(pattern["pattern_id"], "PATTERN-003")


class TestPatternMerging(unittest.TestCase):
    """Test merging learning into existing pattern."""

    def setUp(self):
        self.agg = ReflectionAggregator()

    def test_merge_increments_occurrences(self):
        """Merging should increment occurrence count."""
        learning = {
            "learning_id": "plan-9-iter-9-learning-002",
            "project": "TestProject",
            "severity": "medium",
            "affected_files": [],
        }
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 2,
            "projects": ["TestProject"],
            "source_learnings": ["learning-001"],
        }

        updated = self.agg.merge_into_pattern(learning, pattern)
        self.assertEqual(updated["occurrences"], 3)
        self.assertIn("plan-9-iter-9-learning-002", updated["source_learnings"])

    def test_merge_adds_new_project(self):
        """Merging from new project should add to projects list."""
        learning = {
            "learning_id": "learning-002",
            "project": "NewProject",
            "severity": "medium",
            "affected_files": [],
        }
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 1,
            "projects": ["OldProject"],
            "source_learnings": ["learning-001"],
        }

        updated = self.agg.merge_into_pattern(learning, pattern)
        self.assertIn("NewProject", updated["projects"])
        self.assertIn("OldProject", updated["projects"])
        self.assertEqual(len(updated["projects"]), 2)

    def test_merge_escalates_severity(self):
        """Higher severity learning should escalate pattern severity."""
        learning = {
            "learning_id": "learning-002",
            "project": "Test",
            "severity": "critical",
            "affected_files": [],
        }
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 1,
            "projects": ["Test"],
            "severity": "low",
            "source_learnings": ["learning-001"],
        }

        updated = self.agg.merge_into_pattern(learning, pattern)
        self.assertEqual(updated["severity"], "critical")

    def test_merge_combines_affected_files(self):
        """Affected files should be merged without duplicates."""
        learning = {
            "learning_id": "learning-002",
            "project": "Test",
            "severity": "medium",
            "affected_files": ["file2.py", "file1.py"],  # file1.py duplicate
        }
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 1,
            "projects": ["Test"],
            "source_learnings": ["learning-001"],
            "affected_files": ["file1.py"],
        }

        updated = self.agg.merge_into_pattern(learning, pattern)
        self.assertIn("file1.py", updated["affected_files"])
        self.assertIn("file2.py", updated["affected_files"])
        # Should have 2 unique files
        self.assertEqual(len(updated["affected_files"]), 2)


class TestJSONLReading(unittest.TestCase):
    """Test JSONL file reading."""

    def test_read_empty_file(self):
        """Empty file should return empty list."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            temp_path = Path(f.name)

        try:
            learnings = read_jsonl(temp_path)
            self.assertEqual(learnings, [])
        finally:
            temp_path.unlink()

    def test_read_valid_jsonl(self):
        """Valid JSONL should be parsed correctly."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            f.write('{"learning_id": "001", "issue": "Test 1"}\n')
            f.write('{"learning_id": "002", "issue": "Test 2"}\n')
            temp_path = Path(f.name)

        try:
            learnings = read_jsonl(temp_path)
            self.assertEqual(len(learnings), 2)
            self.assertEqual(learnings[0]["learning_id"], "001")
            self.assertEqual(learnings[1]["learning_id"], "002")
        finally:
            temp_path.unlink()

    def test_read_with_blank_lines(self):
        """Blank lines should be skipped."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            f.write('{"learning_id": "001"}\n')
            f.write('\n')
            f.write('{"learning_id": "002"}\n')
            temp_path = Path(f.name)

        try:
            learnings = read_jsonl(temp_path)
            self.assertEqual(len(learnings), 2)
        finally:
            temp_path.unlink()

    def test_read_with_malformed_line(self):
        """Malformed lines should be skipped with warning."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            f.write('{"learning_id": "001"}\n')
            f.write('invalid json here\n')
            f.write('{"learning_id": "002"}\n')
            temp_path = Path(f.name)

        try:
            learnings = read_jsonl(temp_path)
            # Should have 2 valid entries (malformed skipped)
            self.assertEqual(len(learnings), 2)
            self.assertEqual(learnings[0]["learning_id"], "001")
            self.assertEqual(learnings[1]["learning_id"], "002")
        finally:
            temp_path.unlink()


class TestIncrementalAggregation(unittest.TestCase):
    """Test incremental aggregation workflow."""

    def setUp(self):
        self.agg = ReflectionAggregator(similarity_threshold=0.8)

    def test_incremental_skips_processed_learnings(self):
        """Incremental mode should skip already-processed learnings."""
        learnings = [
            {
                "learning_id": "learning-001",
                "project": "Test",
                "category": "functionality",
                "root_cause": "Missing exploration before vision generation",
                "issue": "Issue A",
                "severity": "medium",
                "suggested_fix": "Fix A",
                "affected_files": [],
            },
            {
                "learning_id": "learning-002",
                "project": "Test",
                "category": "functionality",
                "root_cause": "YAML parsing error in configuration",  # Completely different
                "issue": "Issue B",
                "severity": "medium",
                "suggested_fix": "Fix B",
                "affected_files": [],
            },
        ]
        existing_patterns = [
            {
                "pattern_id": "PATTERN-001",
                "root_cause": "Missing exploration before vision generation",
                "category": "functionality",
                "source_learnings": ["learning-001"],
                "occurrences": 1,
                "projects": ["Test"],
            }
        ]

        updated_patterns, new_count, merged_count = self.agg.aggregate_learnings(
            learnings, existing_patterns, mode="incremental"
        )

        # Should have 2 patterns (one existing, one new from learning-002)
        self.assertEqual(len(updated_patterns), 2)
        # Should create 1 new pattern (learning-002 is dissimilar)
        self.assertEqual(new_count, 1)
        # Should merge 0 (learning-001 already processed, learning-002 dissimilar)
        self.assertEqual(merged_count, 0)

    def test_full_mode_rebuilds_from_scratch(self):
        """Full mode should rebuild all patterns from scratch."""
        learnings = [
            {
                "learning_id": "learning-001",
                "project": "Test",
                "category": "functionality",
                "root_cause": "Issue A",
                "issue": "Issue A",
                "severity": "medium",
                "suggested_fix": "Fix A",
                "affected_files": [],
            },
            {
                "learning_id": "learning-002",
                "project": "Test",
                "category": "functionality",
                "root_cause": "Issue A",  # Similar to learning-001
                "issue": "Issue A",
                "severity": "medium",
                "suggested_fix": "Fix A",
                "affected_files": [],
            },
        ]
        existing_patterns = []

        updated_patterns, new_count, merged_count = self.agg.aggregate_learnings(
            learnings, existing_patterns, mode="full"
        )

        # Should have 1 pattern (both learnings similar)
        self.assertEqual(len(updated_patterns), 1)
        # Pattern should have 2 occurrences
        self.assertEqual(updated_patterns[0]["occurrences"], 2)


class TestFrameworkIssueFiltering(unittest.TestCase):
    """Test framework issue detection (Plan-10 enhanced filtering)."""

    def setUp(self):
        # Import reflection generator for is_framework_issue tests
        import importlib.util
        _generator_path = Path(__file__).parent / "2l-reflection-generator.py"
        _spec = importlib.util.spec_from_file_location("generator", _generator_path)
        generator_module = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(generator_module)
        self.ReflectionGenerator = generator_module.ReflectionGenerator

        # Create dummy generator instance
        with tempfile.TemporaryDirectory() as tmpdir:
            iteration_dir = Path(tmpdir)
            self.generator = self.ReflectionGenerator(iteration_dir, "plan-10", 10)

    def test_framework_path_captures_issue(self):
        """Issue in framework path should be captured."""
        issue = {
            'issue': 'YAML parsing error',
            'root_cause': 'Invalid format',
            'location': 'lib/2l-reflection-aggregator.py'
        }
        self.assertTrue(self.generator.is_framework_issue(issue))

    def test_project_path_excludes_issue(self):
        """Issue in project path should be excluded."""
        issue = {
            'issue': 'Database query slow',
            'root_cause': 'Missing index',
            'location': 'app/services/auth.ts'
        }
        self.assertFalse(self.generator.is_framework_issue(issue))

    def test_framework_keyword_without_path_captures(self):
        """Framework keyword without location should be captured."""
        issue = {
            'issue': 'Integration phase slow',
            'root_cause': 'Too many builders',
            'location': ''
        }
        self.assertTrue(self.generator.is_framework_issue(issue))

    def test_app_performance_excluded(self):
        """App performance issue should be excluded."""
        issue = {
            'issue': 'Database query slow',
            'root_cause': 'No caching',
            'location': ''
        }
        self.assertFalse(self.generator.is_framework_issue(issue))

    def test_agent_spawn_timeout_captured(self):
        """Agent spawn timeout should be captured."""
        issue = {
            'issue': 'Agent spawn timeout',
            'root_cause': 'Claude API slow',
            'location': ''
        }
        self.assertTrue(self.generator.is_framework_issue(issue))

    def test_framework_path_overrides_ambiguous_text(self):
        """Framework path should override ambiguous issue text."""
        issue = {
            'issue': 'Builder took 2 minutes',
            'root_cause': 'Slow implementation',
            'location': 'agents/2l-builder.md'
        }
        self.assertTrue(self.generator.is_framework_issue(issue))

    def test_project_path_overrides_framework_keyword(self):
        """Project path should override framework keyword."""
        issue = {
            'issue': 'Builder pattern slow',  # 'builder' is framework keyword
            'root_cause': 'Complex nesting',
            'location': 'src/utils/builder.ts'  # But in project path
        }
        self.assertFalse(self.generator.is_framework_issue(issue))

    def test_conservative_bias_excludes_uncertain(self):
        """Uncertain cases should be excluded (conservative bias)."""
        issue = {
            'issue': 'Slow response',
            'root_cause': 'Unknown',
            'location': ''
        }
        self.assertFalse(self.generator.is_framework_issue(issue))

    def test_cross_project_keywords_captured(self):
        """Plan-10 cross-project keywords should be captured."""
        issue = {
            'issue': 'Multi-source aggregation failing',
            'root_cause': 'federation logic broken',
            'location': ''
        }
        self.assertTrue(self.generator.is_framework_issue(issue))


class TestPriorityClassification(unittest.TestCase):
    """Test priority classification (Plan-10 enhanced P1/P2/P3 semantics)."""

    def setUp(self):
        # Import reflection generator
        import importlib.util
        _generator_path = Path(__file__).parent / "2l-reflection-generator.py"
        _spec = importlib.util.spec_from_file_location("generator", _generator_path)
        generator_module = importlib.util.module_from_spec(_spec)
        _spec.loader.exec_module(generator_module)
        self.ReflectionGenerator = generator_module.ReflectionGenerator

        with tempfile.TemporaryDirectory() as tmpdir:
            iteration_dir = Path(tmpdir)
            self.generator = self.ReflectionGenerator(iteration_dir, "plan-10", 10)

    def test_agent_crash_is_p1(self):
        """Agent crash should be P1 (functionality)."""
        issue = {
            'issue': 'Builder agent crashes on complex tasks',
            'root_cause': 'Memory overflow',
            'impact': 'Workflow blocked'
        }
        priority = self.generator.categorize_by_priority(issue)
        self.assertEqual(priority, 'P1')

    def test_missing_feature_is_p2(self):
        """Missing feature should be P2 (completeness)."""
        issue = {
            'issue': 'No healing phase for failed integrations',
            'root_cause': 'Missing implementation',
            'impact': 'Manual fixes required'
        }
        priority = self.generator.categorize_by_priority(issue)
        self.assertEqual(priority, 'P2')

    def test_framework_performance_is_p3(self):
        """Framework performance issue should be P3 (speed)."""
        issue = {
            'issue': 'Integration phase slow',
            'root_cause': 'Sequential builder execution',
            'impact': '45s for 4 builders'
        }
        priority = self.generator.categorize_by_priority(issue)
        self.assertEqual(priority, 'P3')

    def test_agent_spawn_timeout_is_p3(self):
        """Agent spawn timeout should be P3 (framework speed)."""
        issue = {
            'issue': 'Agent spawn timeout',
            'root_cause': 'API latency',
            'impact': 'Workflow slow'
        }
        priority = self.generator.categorize_by_priority(issue)
        self.assertEqual(priority, 'P3')

    def test_aggregation_slow_is_p3(self):
        """Aggregation slow should be P3 (framework speed)."""
        issue = {
            'issue': 'Aggregation slow with 100+ learnings',
            'root_cause': 'O(n²) similarity matching',
            'impact': '10s aggregation time'
        }
        priority = self.generator.categorize_by_priority(issue)
        self.assertEqual(priority, 'P3')

    def test_app_performance_not_captured(self):
        """App performance should default to P2 (but won't be captured anyway)."""
        # Note: This test shows that even if an app perf issue leaked through,
        # it wouldn't be misclassified as P3 unless it has framework context
        issue = {
            'issue': 'Database query slow',
            'root_cause': 'Missing index',
            'impact': 'API slow'
        }
        priority = self.generator.categorize_by_priority(issue)
        # Without framework context, generic 'slow' defaults to P2
        self.assertEqual(priority, 'P2')

    def test_reflection_generation_timeout_is_p3(self):
        """Reflection generation timeout should be P3."""
        issue = {
            'issue': 'Reflection generation timeout',
            'root_cause': 'Large validation report',
            'impact': '30s timeout'
        }
        priority = self.generator.categorize_by_priority(issue)
        self.assertEqual(priority, 'P3')


if __name__ == "__main__":
    unittest.main()
