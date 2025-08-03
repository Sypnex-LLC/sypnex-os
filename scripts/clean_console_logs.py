#!/usr/bin/env python3
"""
Clean console.log statements from JavaScript files without breaking code structure.
This script properly handles multi-line console.log statements and preserves code integrity.
"""

import os
import re
import glob

def clean_console_logs_from_file(file_path, log_file):
    """Remove console.log statements from a JavaScript file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        cleaned_lines = []
        i = 0
        changes_made = False
        removed_lines = []
        
        while i < len(lines):
            line = lines[i]
            line_number = i + 1
            
            # Check if line contains console.log
            if 'console.log(' in line:
                # Handle multi-line console.log statements
                if line.strip().endswith(');'):
                    # Single line console.log - skip it
                    removed_lines.append((line_number, line.rstrip()))
                    changes_made = True
                    i += 1
                    continue
                else:
                    # Multi-line console.log - find the end
                    paren_count = line.count('(') - line.count(')')
                    multiline_start = line_number
                    multiline_content = [line.rstrip()]
                    changes_made = True
                    i += 1
                    
                    # Keep skipping lines until we balance parentheses
                    while i < len(lines) and paren_count > 0:
                        next_line = lines[i]
                        multiline_content.append(next_line.rstrip())
                        paren_count += next_line.count('(') - next_line.count(')')
                        i += 1
                    
                    # Log the entire multi-line console.log
                    removed_lines.append((multiline_start, '\n'.join(multiline_content)))
                    continue
            
            # Keep the line if it doesn't contain console.log
            cleaned_lines.append(line)
            i += 1
        
        # Write back to file if changes were made
        if changes_made:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(cleaned_lines)
            
            # Log what was removed
            log_file.write(f"\n{'='*80}\n")
            log_file.write(f"FILE: {file_path}\n")
            log_file.write(f"{'='*80}\n")
            
            for line_num, content in removed_lines:
                log_file.write(f"Line {line_num}: {content}\n")
            
            log_file.write(f"\nRemoved {len(removed_lines)} console.log statement(s) from this file.\n")
            
            print(f"Cleaned: {file_path} (removed {len(removed_lines)} console.log statements)")
            return True
        
        return False
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to clean console.log from all JavaScript files."""
    # Use current directory where the script is located
    base_path = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(base_path, "clean.txt")
    
    # Find all JavaScript files recursively
    print(f"Scanning directory: {base_path}")
    js_files = []
    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith('.js'):
                js_files.append(os.path.join(root, file))
    
    print(f"Found {len(js_files)} JavaScript files across all subdirectories")
    
    # Open log file for writing
    with open(log_path, 'w', encoding='utf-8') as log_file:
        log_file.write("Console.log Removal Log\n")
        log_file.write(f"Generated on: {os.path.basename(__file__)}\n")
        log_file.write(f"Total files scanned: {len(js_files)}\n")
        log_file.write("\nThe following console.log statements were removed:\n")
        
        cleaned_count = 0
        total_removed = 0
        
        for js_file in js_files:
            if clean_console_logs_from_file(js_file, log_file):
                cleaned_count += 1
        
        log_file.write(f"\n{'='*80}\n")
        log_file.write(f"SUMMARY\n")
        log_file.write(f"{'='*80}\n")
        log_file.write(f"Files processed: {len(js_files)}\n")
        log_file.write(f"Files modified: {cleaned_count}\n")
    
    print(f"Cleaned {cleaned_count} files")
    print(f"Detailed log saved to: {log_path}")

if __name__ == "__main__":
    main()
