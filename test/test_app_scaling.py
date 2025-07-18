#!/usr/bin/env python3
"""
Test script for app scaling functionality
"""

import requests
import json
import time

def test_app_scaling():
    """Test the app scaling functionality"""
    base_url = "http://localhost:5000"
    
    print("🧪 Testing App Scaling Functionality")
    print("=" * 50)
    
    # Test 1: Check if the preference API is working
    print("\n1. Testing preference API...")
    try:
        response = requests.get(f"{base_url}/api/preferences/ui/app_scale")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Preference API working. Current scale: {data.get('value', '100')}%")
        else:
            print(f"❌ Preference API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing preference API: {e}")
        return False
    
    # Test 2: Set different scale values
    test_scales = ['75', '100', '125', '150']
    
    for scale in test_scales:
        print(f"\n2. Testing scale {scale}%...")
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
    
    # Test 3: Test invalid scale values
    print(f"\n3. Testing invalid scale values...")
    invalid_scales = ['0', '200', 'abc', '-10']
    
    for scale in invalid_scales:
        try:
            response = requests.post(
                f"{base_url}/api/preferences/ui/app_scale",
                headers={'Content-Type': 'application/json'},
                json={'value': scale}
            )
            
            # Should accept any value (validation happens on frontend)
            if response.status_code == 200:
                print(f"✅ Invalid scale {scale} accepted (frontend validation)")
            else:
                print(f"⚠️  Invalid scale {scale} rejected: {response.status_code}")
                
        except Exception as e:
            print(f"❌ Error testing invalid scale {scale}: {e}")
    
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
    print("🎉 App scaling functionality test completed!")
    print("\n📝 Manual Testing Instructions:")
    print("1. Open http://localhost:5000 in your browser")
    print("2. Open System Settings (gear icon in status bar)")
    print("3. Change the 'App Scale' setting")
    print("4. Open any app (like Text Editor) and verify the scaling")
    print("5. Try different scale values and check if they persist")
    
    return True

if __name__ == "__main__":
    test_app_scaling() 