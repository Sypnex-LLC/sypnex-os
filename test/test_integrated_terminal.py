#!/usr/bin/env python3
"""
Test file for integrated terminal functionality
"""

print("Hello from integrated terminal!")
print("=" * 40)

# Test some basic operations
import os
import sys

print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")

# Test a simple calculation
result = 2 + 2
print(f"2 + 2 = {result}")

# Test list operations
numbers = [1, 2, 3, 4, 5]
squared = [x**2 for x in numbers]
print(f"Numbers: {numbers}")
print(f"Squared: {squared}")

print("=" * 40)
print("Test completed successfully!") 