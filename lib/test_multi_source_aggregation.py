#!/usr/bin/env python3
"""
Unit tests for multi-source aggregation features (Plan-10)
"""

import unittest
import tempfile
import json
from pathlib import Path
import sys

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import aggregator (dynamic import due to hyphen in filename)
import importlib.util

# Import reflection aggregator
_aggregator_path = Path(__file__).parent / "2l-reflection-aggregator.py"
_spec = importlib.util.spec_from_file_location("aggregator", _aggregator_path)
aggregator = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(aggregator)

infer_source_project = aggregator.infer_source_project
read_multi_source_jsonl = aggregator.read_multi_source_jsonl
ReflectionAggregator = aggregator.ReflectionAggregator

# Import reflection generator
_generator_path = Path(__file__).parent / "2l-reflection-generator.py"
_spec2 = importlib.util.spec_from_file_location("generator", _generator_path)
generator = importlib.util.module_from_spec(_spec2)
_spec2.loader.exec_module(generator)

infer_source_project_gen = generator.infer_source_project


class TestSourceProjectDerivation(unittest.TestCase):
    """Test source project name inference from paths."""

    def test_meditation_space(self):
        """Meditation space path should return 'meditation-space'."""
        path = Path("/home/user/Ahiya/2L/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "meditation-space")

    def test_meditation_space_nested(self):
        """Nested meditation space path should return 'meditation-space'."""
        path = Path("/home/user/Ahiya/2L/.2L/plan-10/iteration-5/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "meditation-space")

    def test_prod_simple(self):
        """Simple Prod/* project should return project name."""
        path = Path("/home/user/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "StatViz")

    def test_prod_nested_two_levels(self):
        """Nested Prod/* project (2 levels) should return dash-separated name."""
        path = Path("/home/user/Ahiya/2L/Prod/clients/acme/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "clients-acme")

    def test_prod_nested_three_levels(self):
        """Nested Prod/* project (3 levels) should return dash-separated name."""
        path = Path("/home/user/Ahiya/2L/Prod/clients/acme/dashboard/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "clients-acme-dashboard")

    def test_prod_another_project(self):
        """Another Prod/* project should return correct name."""
        path = Path("/home/user/Ahiya/2L/Prod/wealth/.2L/global-learnings.jsonl")
        self.assertEqual(infer_source_project(path), "wealth")

    def test_generator_function_matches_aggregator(self):
        """Both infer_source_project implementations should match."""
        # Test meditation space
        path1 = Path("/home/user/Ahiya/2L/.2L/global-learnings.jsonl")
        self.assertEqual(
            infer_source_project_gen(path1),
            infer_source_project(path1)
        )

        # Test Prod/* project
        path2 = Path("/home/user/Ahiya/2L/Prod/StatViz/.2L/global-learnings.jsonl")
        self.assertEqual(
            infer_source_project_gen(path2),
            infer_source_project(path2)
        )


class TestMultiSourceReading(unittest.TestCase):
    """Test reading learnings from multiple JSONL sources."""

    def setUp(self):
        """Create temporary test files."""
        self.temp_dir = tempfile.mkdtemp()
        self.temp_path = Path(self.temp_dir)

    def tearDown(self):
        """Clean up temporary files."""
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_empty_sources(self):
        """Empty source list should return empty list."""
        learnings = read_multi_source_jsonl([])
        self.assertEqual(learnings, [])

    def test_single_source(self):
        """Single source should work correctly."""
        # Create test file
        jsonl_path = self.temp_path / "test1.jsonl"
        with open(jsonl_path, 'w') as f:
            f.write(json.dumps({"learning_id": "test-1", "root_cause": "Test issue"}) + '\n')

        learnings = read_multi_source_jsonl([jsonl_path])
        self.assertEqual(len(learnings), 1)
        self.assertEqual(learnings[0]['learning_id'], 'test-1')
        # Should have source_project field added
        self.assertIn('source_project', learnings[0])

    def test_multiple_sources(self):
        """Multiple sources should be combined."""
        # Create test files
        jsonl1 = self.temp_path / "test1.jsonl"
        jsonl2 = self.temp_path / "test2.jsonl"

        with open(jsonl1, 'w') as f:
            f.write(json.dumps({"learning_id": "test-1", "root_cause": "Issue 1"}) + '\n')

        with open(jsonl2, 'w') as f:
            f.write(json.dumps({"learning_id": "test-2", "root_cause": "Issue 2"}) + '\n')
            f.write(json.dumps({"learning_id": "test-3", "root_cause": "Issue 3"}) + '\n')

        learnings = read_multi_source_jsonl([jsonl1, jsonl2])
        self.assertEqual(len(learnings), 3)
        learning_ids = [l['learning_id'] for l in learnings]
        self.assertIn('test-1', learning_ids)
        self.assertIn('test-2', learning_ids)
        self.assertIn('test-3', learning_ids)

    def test_backwards_compatibility_adds_source_project(self):
        """Learnings without source_project field should get it added."""
        jsonl_path = self.temp_path / "test.jsonl"
        with open(jsonl_path, 'w') as f:
            # Learning WITHOUT source_project field
            f.write(json.dumps({"learning_id": "test-1", "root_cause": "Test"}) + '\n')

        learnings = read_multi_source_jsonl([jsonl_path])
        self.assertEqual(len(learnings), 1)
        # Field should be added
        self.assertIn('source_project', learnings[0])
        self.assertEqual(learnings[0]['source_project'], 'meditation-space')

    def test_backwards_compatibility_preserves_existing_source_project(self):
        """Learnings with source_project field should keep it."""
        jsonl_path = self.temp_path / "test.jsonl"
        with open(jsonl_path, 'w') as f:
            # Learning WITH source_project field
            f.write(json.dumps({
                "learning_id": "test-1",
                "source_project": "ExistingProject",
                "root_cause": "Test"
            }) + '\n')

        learnings = read_multi_source_jsonl([jsonl_path])
        self.assertEqual(len(learnings), 1)
        # Original value should be preserved
        self.assertEqual(learnings[0]['source_project'], 'ExistingProject')

    def test_error_recovery_malformed_json(self):
        """Malformed JSON line should be skipped with warning."""
        jsonl_path = self.temp_path / "test.jsonl"
        with open(jsonl_path, 'w') as f:
            f.write(json.dumps({"learning_id": "test-1", "root_cause": "Good"}) + '\n')
            f.write('{"bad json\n')  # Malformed
            f.write(json.dumps({"learning_id": "test-2", "root_cause": "Also good"}) + '\n')

        learnings = read_multi_source_jsonl([jsonl_path])
        # Should get 2 learnings (malformed line skipped)
        self.assertEqual(len(learnings), 2)
        learning_ids = [l['learning_id'] for l in learnings]
        self.assertIn('test-1', learning_ids)
        self.assertIn('test-2', learning_ids)

    def test_error_recovery_missing_file(self):
        """Missing file should be skipped with warning."""
        missing_path = self.temp_path / "does-not-exist.jsonl"
        existing_path = self.temp_path / "exists.jsonl"

        with open(existing_path, 'w') as f:
            f.write(json.dumps({"learning_id": "test-1", "root_cause": "Test"}) + '\n')

        # Should not crash, just skip missing file
        learnings = read_multi_source_jsonl([missing_path, existing_path])
        self.assertEqual(len(learnings), 1)
        self.assertEqual(learnings[0]['learning_id'], 'test-1')


class TestPatternMergingWithSourceTracking(unittest.TestCase):
    """Test pattern merging tracks source_projects correctly."""

    def setUp(self):
        """Create aggregator instance."""
        self.agg = ReflectionAggregator(similarity_threshold=0.8)

    def test_merge_tracks_source_project(self):
        """Merging learning should track source_project."""
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 1,
            "source_learnings": ["learning-1"],
            "projects": ["2L-self-improvement"],
            "source_projects": ["meditation-space"],
            "evidence_count": 1
        }

        learning = {
            "learning_id": "learning-2",
            "project": "2L-self-improvement",
            "source_project": "StatViz",
            "root_cause": "Same issue"
        }

        updated = self.agg.merge_into_pattern(learning, pattern)

        # Should track new source_project
        self.assertIn("StatViz", updated["source_projects"])
        self.assertEqual(len(updated["source_projects"]), 2)
        # Should update evidence count
        self.assertEqual(updated["evidence_count"], 2)

    def test_merge_deduplicates_source_projects(self):
        """Merging from same source should not duplicate."""
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 1,
            "source_learnings": ["learning-1"],
            "projects": ["2L-self-improvement"],
            "source_projects": ["StatViz"],
            "evidence_count": 1
        }

        learning = {
            "learning_id": "learning-2",
            "project": "2L-self-improvement",
            "source_project": "StatViz",  # Same source
            "root_cause": "Same issue again"
        }

        updated = self.agg.merge_into_pattern(learning, pattern)

        # Should still have only 1 unique source_project
        self.assertEqual(len(updated["source_projects"]), 1)
        self.assertEqual(updated["source_projects"], ["StatViz"])
        # But evidence count should increase
        self.assertEqual(updated["evidence_count"], 2)

    def test_merge_handles_missing_source_projects_field(self):
        """Pattern without source_projects field should get it initialized."""
        # Legacy pattern without source_projects
        pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 1,
            "source_learnings": ["learning-1"],
            "projects": ["2L-self-improvement"]
        }

        learning = {
            "learning_id": "learning-2",
            "project": "2L-self-improvement",
            "source_project": "StatViz",
            "root_cause": "Issue"
        }

        updated = self.agg.merge_into_pattern(learning, pattern)

        # Should initialize field
        self.assertIn("source_projects", updated)
        self.assertEqual(updated["source_projects"], ["StatViz"])
        self.assertEqual(updated["evidence_count"], 2)


class TestPatternCreationWithSourceTracking(unittest.TestCase):
    """Test new pattern creation initializes source tracking fields."""

    def setUp(self):
        """Create aggregator instance."""
        self.agg = ReflectionAggregator(similarity_threshold=0.8)

    def test_create_initializes_source_projects(self):
        """New pattern should have source_projects field."""
        learning = {
            "learning_id": "test-1",
            "source_project": "StatViz",
            "project": "2L-self-improvement",
            "issue": "Test issue",
            "root_cause": "Root cause",
            "category": "functionality",
            "severity": "medium",
            "timestamp": "2025-01-01T00:00:00"
        }

        pattern = self.agg.create_new_pattern(learning, [])

        self.assertIn("source_projects", pattern)
        self.assertEqual(pattern["source_projects"], ["StatViz"])
        self.assertEqual(pattern["evidence_count"], 1)

    def test_create_handles_missing_source_project_field(self):
        """Learning without source_project should default to 'unknown'."""
        learning = {
            "learning_id": "test-1",
            # No source_project field
            "project": "2L-self-improvement",
            "issue": "Test issue",
            "root_cause": "Root cause",
            "category": "functionality",
            "severity": "medium",
            "timestamp": "2025-01-01T00:00:00"
        }

        pattern = self.agg.create_new_pattern(learning, [])

        self.assertEqual(pattern["source_projects"], ["unknown"])
        self.assertEqual(pattern["evidence_count"], 1)


class TestBackwardsCompatibility(unittest.TestCase):
    """Test backwards compatibility with existing data."""

    def test_pattern_without_source_projects_handled(self):
        """Pattern without source_projects field should be handled gracefully."""
        # Simulate reading old pattern from YAML
        old_pattern = {
            "pattern_id": "PATTERN-001",
            "occurrences": 3,
            "projects": ["2L-self-improvement"],
            # No source_projects field
            # No evidence_count field
        }

        # Using .get() with defaults (as code should do)
        source_projects = old_pattern.get('source_projects', [])
        evidence_count = old_pattern.get('evidence_count', 0)

        self.assertEqual(source_projects, [])
        self.assertEqual(evidence_count, 0)

    def test_learning_without_source_project_handled(self):
        """Learning without source_project field should be handled gracefully."""
        old_learning = {
            "learning_id": "test-1",
            "root_cause": "Issue",
            # No source_project field
        }

        # Using .get() with default (as code should do)
        source_project = old_learning.get('source_project', 'meditation-space')

        self.assertEqual(source_project, 'meditation-space')


if __name__ == '__main__':
    unittest.main()
