"""Tests for secret parser framework and transformations."""

import pytest
from app.core.secret_parser import (
    SecretTransform,
    apply_transformations,
    merge_transforms,
)


class TestSecretTransform:
    """Test SecretTransform dataclass."""

    def test_empty_transform(self):
        """Test empty SecretTransform has no conflict."""
        transform = SecretTransform()
        assert not transform.has_conflict()
        assert transform.reassign == {}
        assert transform.append == {}
        assert transform.reassign_global == {}
        assert transform.append_global == {}

    def test_reassign_only(self):
        """Test SecretTransform with only reassign has no conflict."""
        transform = SecretTransform(reassign={"NEW_KEY": "value"})
        assert not transform.has_conflict()
        assert transform.reassign == {"NEW_KEY": "value"}
        assert transform.append == {}

    def test_append_only(self):
        """Test SecretTransform with only append has no conflict."""
        transform = SecretTransform(append={"EXTRA_KEY": "value"})
        assert not transform.has_conflict()
        assert transform.reassign == {}
        assert transform.append == {"EXTRA_KEY": "value"}

    def test_reassign_global_only(self):
        """Test SecretTransform with only reassign_global has no conflict."""
        transform = SecretTransform(reassign_global={"GLOBAL_KEY": "value"})
        assert not transform.has_conflict()
        assert transform.reassign_global == {"GLOBAL_KEY": "value"}
        assert transform.append_global == {}

    def test_append_global_only(self):
        """Test SecretTransform with only append_global has no conflict."""
        transform = SecretTransform(append_global={"GLOBAL_EXTRA": "value"})
        assert not transform.has_conflict()
        assert transform.append_global == {"GLOBAL_EXTRA": "value"}

    def test_conflict_detection(self):
        """Test SecretTransform detects conflict when both reassign and append are set."""
        transform = SecretTransform(
            reassign={"NEW_KEY": "value"},
            append={"EXTRA_KEY": "value"}
        )
        assert transform.has_conflict()

    def test_global_conflict_detection(self):
        """Test SecretTransform detects conflict when both reassign_global and append_global are set."""
        transform = SecretTransform(
            reassign_global={"NEW_KEY": "value"},
            append_global={"EXTRA_KEY": "value"}
        )
        assert transform.has_conflict()


class TestApplyTransformations:
    """Test apply_transformations function."""

    def test_no_transformation(self):
        """Test that returning None keeps original secrets unchanged."""
        secrets = {"KEY1": "value1", "KEY2": "value2"}

        def no_op_parser(key: str, value: str):
            return None

        namespace, global_env = apply_transformations(secrets, no_op_parser)
        assert namespace == {"KEY1": "value1", "KEY2": "value2"}
        assert global_env == {}

    def test_reassign_transformation(self):
        """Test reassign removes old key and adds new key."""
        secrets = {"OLD_KEY": "value"}

        def reassign_parser(key: str, value: str):
            if key == "OLD_KEY":
                return SecretTransform(reassign={"NEW_KEY": value})
            return None

        namespace, global_env = apply_transformations(secrets, reassign_parser)
        assert "OLD_KEY" not in namespace
        assert namespace["NEW_KEY"] == "value"
        assert global_env == {}

    def test_reassign_global_transformation(self):
        """Test reassign_global removes old key and injects to os.environ."""
        secrets = {"NODE_ENV": "production"}

        def global_reassign_parser(key: str, value: str):
            if key == "NODE_ENV":
                return SecretTransform(reassign_global={"NODE_ENV": value})
            return None

        namespace, global_env = apply_transformations(secrets, global_reassign_parser)
        assert namespace == {}  # Not in namespace
        assert global_env["NODE_ENV"] == "production"  # In global

    def test_append_transformation(self):
        """Test append keeps original key and adds additional keys."""
        secrets = {"DATABASE_URL": "postgres://localhost"}

        def append_parser(key: str, value: str):
            if key == "DATABASE_URL":
                return SecretTransform(append={
                    "DATABASE_URL_PRIMARY": value,
                    "DATABASE_URL_REPLICA": value,
                })
            return None

        namespace, global_env = apply_transformations(secrets, append_parser)
        assert namespace["DATABASE_URL"] == "postgres://localhost"  # Original kept
        assert namespace["DATABASE_URL_PRIMARY"] == "postgres://localhost"
        assert namespace["DATABASE_URL_REPLICA"] == "postgres://localhost"
        assert global_env == {}

    def test_append_global_transformation(self):
        """Test append_global keeps original key in global and adds additional keys."""
        secrets = {"PATH_EXT": "/custom/path"}

        def global_append_parser(key: str, value: str):
            if key == "PATH_EXT":
                return SecretTransform(append_global={
                    "CUSTOM_PATH_1": value,
                    "CUSTOM_PATH_2": value,
                })
            return None

        namespace, global_env = apply_transformations(secrets, global_append_parser)
        assert namespace == {}
        assert global_env["PATH_EXT"] == "/custom/path"  # Original kept in global
        assert global_env["CUSTOM_PATH_1"] == "/custom/path"
        assert global_env["CUSTOM_PATH_2"] == "/custom/path"

    def test_mixed_namespace_and_global(self):
        """Test mixed namespace and global transformations."""
        secrets = {"API_KEY": "secret123"}

        def mixed_parser(key: str, value: str):
            if key == "API_KEY":
                return SecretTransform(
                    reassign={"API_KEY_NS": value},  # Namespace
                    reassign_global={"API_KEY": value}  # Global
                )
            return None

        namespace, global_env = apply_transformations(secrets, mixed_parser)
        assert namespace["API_KEY_NS"] == "secret123"
        assert "API_KEY" not in namespace  # Reassigned in namespace
        assert global_env["API_KEY"] == "secret123"

    def test_conflict_reassign_wins(self):
        """Test that when both reassign and append exist, reassign takes priority."""
        secrets = {"CONFLICT_KEY": "value"}

        def conflict_parser(key: str, value: str):
            if key == "CONFLICT_KEY":
                return SecretTransform(
                    reassign={"REASSIGNED_KEY": value},
                    append={"APPENDED_KEY": value}
                )
            return None

        namespace, global_env = apply_transformations(secrets, conflict_parser)
        # Reassign wins, so:
        # - Original key is removed
        # - Reassigned key is added
        # - Appended key is NOT added (conflict resolution)
        assert "CONFLICT_KEY" not in namespace
        assert namespace["REASSIGNED_KEY"] == "value"
        assert "APPENDED_KEY" not in namespace

    def test_global_conflict_reassign_wins(self):
        """Test that when both reassign_global and append_global exist, reassign wins."""
        secrets = {"CONFLICT_KEY": "value"}

        def global_conflict_parser(key: str, value: str):
            if key == "CONFLICT_KEY":
                return SecretTransform(
                    reassign_global={"REASSIGNED_KEY": value},
                    append_global={"APPENDED_KEY": value}
                )
            return None

        namespace, global_env = apply_transformations(secrets, global_conflict_parser)
        assert namespace == {}
        assert "CONFLICT_KEY" not in global_env
        assert global_env["REASSIGNED_KEY"] == "value"
        assert "APPENDED_KEY" not in global_env

    def test_empty_transform_keeps_original(self):
        """Test that empty SecretTransform keeps original key."""
        secrets = {"KEY": "value"}

        def empty_transform_parser(key: str, value: str):
            return SecretTransform()  # Empty transform

        namespace, global_env = apply_transformations(secrets, empty_transform_parser)
        assert namespace["KEY"] == "value"
        assert global_env == {}

    def test_parser_exception_keeps_original(self):
        """Test that parser exceptions are caught and original key is kept."""
        secrets = {"ERROR_KEY": "value", "GOOD_KEY": "value2"}

        def error_parser(key: str, value: str):
            if key == "ERROR_KEY":
                raise ValueError("Parser error!")
            return None

        namespace, global_env = apply_transformations(secrets, error_parser)
        # ERROR_KEY kept despite exception
        assert namespace["ERROR_KEY"] == "value"
        assert namespace["GOOD_KEY"] == "value2"
        assert global_env == {}


class TestMergeTransforms:
    """Test merge_transforms utility function."""

    def test_merge_empty_transforms(self):
        """Test merging empty transforms."""
        merged = merge_transforms(SecretTransform(), SecretTransform())
        assert merged.reassign == {}
        assert merged.append == {}
        assert merged.reassign_global == {}
        assert merged.append_global == {}

    def test_merge_with_none(self):
        """Test merging with None values."""
        transform = SecretTransform(reassign={"KEY": "value"})
        merged = merge_transforms(None, transform, None)
        assert merged.reassign == {"KEY": "value"}
        assert merged.append == {}

    def test_merge_reassign(self):
        """Test merging multiple reassign transforms."""
        t1 = SecretTransform(reassign={"KEY1": "value1"})
        t2 = SecretTransform(reassign={"KEY2": "value2"})
        merged = merge_transforms(t1, t2)
        assert merged.reassign == {"KEY1": "value1", "KEY2": "value2"}

    def test_merge_append(self):
        """Test merging multiple append transforms."""
        t1 = SecretTransform(append={"EXTRA1": "value1"})
        t2 = SecretTransform(append={"EXTRA2": "value2"})
        merged = merge_transforms(t1, t2)
        assert merged.append == {"EXTRA1": "value1", "EXTRA2": "value2"}

    def test_merge_global_fields(self):
        """Test merging global reassign and append transforms."""
        t1 = SecretTransform(reassign_global={"GLOBAL1": "value1"})
        t2 = SecretTransform(append_global={"GLOBAL2": "value2"})
        merged = merge_transforms(t1, t2)
        assert merged.reassign_global == {"GLOBAL1": "value1"}
        assert merged.append_global == {"GLOBAL2": "value2"}

    def test_merge_mixed(self):
        """Test merging transforms with both reassign and append."""
        t1 = SecretTransform(reassign={"KEY1": "value1"}, append={"EXTRA1": "value1"})
        t2 = SecretTransform(reassign={"KEY2": "value2"}, append={"EXTRA2": "value2"})
        merged = merge_transforms(t1, t2)
        assert merged.reassign == {"KEY1": "value1", "KEY2": "value2"}
        assert merged.append == {"EXTRA1": "value1", "EXTRA2": "value2"}


class TestIntegrationScenarios:
    """Integration tests for real-world scenarios."""

    def test_environment_variables_to_global(self):
        """Test injecting environment variables to os.environ."""
        secrets = {
            "NODE_ENV": "production",
            "PYTHON_ENV": "production",
            "DB_PASSWORD": "secret",
        }

        def env_to_global_parser(key: str, value: str):
            # Environment type vars go to global
            if key in ["NODE_ENV", "PYTHON_ENV"]:
                return SecretTransform(reassign_global={key: value})
            # DB credentials stay in namespace
            return None

        namespace, global_env = apply_transformations(secrets, env_to_global_parser)
        assert namespace["DB_PASSWORD"] == "secret"  # Kept in namespace
        assert "NODE_ENV" not in namespace
        assert "PYTHON_ENV" not in namespace
        assert global_env["NODE_ENV"] == "production"
        assert global_env["PYTHON_ENV"] == "production"
        assert "DB_PASSWORD" not in global_env

    def test_dual_storage_pattern(self):
        """Test storing same secret in both namespace and global."""
        secrets = {"SHARED_API_KEY": "secret123"}

        def dual_storage_parser(key: str, value: str):
            if key == "SHARED_API_KEY":
                return SecretTransform(
                    reassign={"API_KEY_NAMESPACE": value},
                    reassign_global={"API_KEY_GLOBAL": value}
                )
            return None

        namespace, global_env = apply_transformations(secrets, dual_storage_parser)
        assert namespace["API_KEY_NAMESPACE"] == "secret123"
        assert global_env["API_KEY_GLOBAL"] == "secret123"
        assert "SHARED_API_KEY" not in namespace
        assert "SHARED_API_KEY" not in global_env

    def test_file_prefix_cleanup_with_global_injection(self):
        """Test cleaning up FILE_ prefixed keys and injecting specific ones globally."""
        secrets = {
            "FILE_CONFIG_DB_HOST": "localhost",
            "FILE_CONFIG_NODE_ENV": "production",
            "NORMAL_KEY": "value",
        }

        def file_cleanup_parser(key: str, value: str):
            if key.startswith("FILE_CONFIG_"):
                clean_key = key.replace("FILE_CONFIG_", "CONFIG_")
                # NODE_ENV goes to global
                if "NODE_ENV" in key:
                    return SecretTransform(reassign_global={"NODE_ENV": value})
                # Others stay in namespace
                return SecretTransform(reassign={clean_key: value})
            return None

        namespace, global_env = apply_transformations(secrets, file_cleanup_parser)
        assert namespace["CONFIG_DB_HOST"] == "localhost"
        assert namespace["NORMAL_KEY"] == "value"
        assert "FILE_CONFIG_DB_HOST" not in namespace
        assert "CONFIG_NODE_ENV" not in namespace  # Went to global instead
        assert global_env["NODE_ENV"] == "production"
