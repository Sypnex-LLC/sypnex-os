#!/usr/bin/env python3
"""
Test script for app scaling fixes (maximize and flicker)
"""

import requests
import json
import time

def test_scaling_fixes():
    """Test the app scaling fixes"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing App Scaling Fixes")
    print("=" * 50)
    
    # Test 1: Set a non-default scale
    print("\n1. Setting scale to 125%...")
    try:
        response = requests.post(
            f"{base_url}/api/preferences/ui/app_scale",
            headers={'Content-Type': 'application/json'},
            json={'value': '125'}
        )
        
        if response.status_code == 200:
            print("✅ Scale set to 125%")
        else:
            print(f"❌ Failed to set scale: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error setting scale: {e}")
        return False
    
    # Test 2: Verify the scale is saved
    print("\n2. Verifying scale is saved...")
    try:
        response = requests.get(f"{base_url}/api/preferences/ui/app_scale")
        if response.status_code == 200:
            data = response.json()
            if data.get('value') == '125':
                print("✅ Scale verified as 125%")
            else:
                print(f"❌ Scale verification failed. Expected 125, got {data.get('value')}")
                return False
        else:
            print(f"❌ Failed to verify scale: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error verifying scale: {e}")
        return False
    
    # Test 3: Test different scales
    test_scales = ['75', '90', '110', '140']
    
    for scale in test_scales:
        print(f"\n3. Testing scale {scale}%...")
        try:
            response = requests.post(
                f"{base_url}/api/preferences/ui/app_scale",
                headers={'Content-Type': 'application/json'},
                json={'value': scale}
            )
            
            if response.status_code == 200:
                print(f"✅ Scale {scale}% set successfully")
                
                # Verify the setting was saved
                verify_response = requests.get(f"{base_url}/api/preferences/ui/app_scale")
                if verify_response.status_code == 200:
                    verify_data = verify_response.json()
                    if verify_data.get('value') == scale:
                        print(f"✅ Scale {scale}% verified in database")
                    else:
                        print(f"❌ Scale verification failed. Expected {scale}, got {verify_data.get('value')}")
                else:
                    print(f"❌ Scale verification failed: {verify_response.status_code}")
            else:
                print(f"❌ Failed to set scale {scale}%: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error testing scale {scale}%: {e}")
            return False
    
    # Test 4: Reset to default scale
    print(f"\n4. Resetting to default scale (100%)...")
    try:
        response = requests.post(
            f"{base_url}/api/preferences/ui/app_scale",
            headers={'Content-Type': 'application/json'},
            json={'value': '100'}
        )
        
        if response.status_code == 200:
            print("✅ Reset to default scale successful")
        else:
            print(f"❌ Reset failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error resetting scale: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 App scaling fixes test completed!")
    print("\n📝 Manual Testing Instructions:")
    print("1. Open http://localhost:5000 in your browser")
    print("2. Open System Settings and set App Scale to 125%")
    print("3. Open Text Editor app - should open with 125% scale immediately (no flicker)")
    print("4. Maximize the app - should maximize to fill screen accounting for 125% scale")
    print("5. Restore the app and try different scale values")
    print("6. Verify that scaling changes are smooth and immediate")
    
    return True

if __name__ == "__main__":
    test_scaling_fixes() 