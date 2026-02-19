import sys
import os

# Add 'app' directory to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

try:
    print("Checking imports...")
    
    # Check services
    from services.cloud_discovery_service import CloudDiscoveryService
    print(" [OK] services.cloud_discovery_service")
    
    from services.cloud_import_service import CloudImportService
    print(" [OK] services.cloud_import_service")
    
    # Check utils
    from utils.cloud_helpers import build_aws_ou_metadata, build_azure_management_group_metadata
    print(" [OK] utils.cloud_helpers used functions")
    
    print("All critical imports verified.")
    
except ImportError as e:
    print(f" [FAIL] ImportError: {e}")
    sys.exit(1)
except Exception as e:
    print(f" [FAIL] Exception: {e}")
    # Print full traceback for context
    import traceback
    traceback.print_exc()
    sys.exit(1)
