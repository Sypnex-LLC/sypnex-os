"""
Global print interceptor utility
Monkey-patches the built-in print function to add caller information
"""
import builtins
import inspect
import os

# Global configuration for print behavior - EDIT THESE TO TOGGLE ON/OFF
_PRINT_CONFIG = {
    'show_regular_prints': False,  # SET TO True/False - show/hide print() output
    'show_error_prints': True,     # SET TO True/False - show/hide eprint() output
}


def setup_print_interceptor():
    """
    Sets up the global print interceptor that adds caller information to all print statements
    """
    # Store the original print function
    original_print = builtins.print
    
    def intercepted_print(*args, **kwargs):
        """
        Custom print function that adds caller information
        Can be toggled to go into the void (not show)
        """
        # Check if regular prints are enabled
        if not _PRINT_CONFIG['show_regular_prints']:
            return  # Send to void - do nothing
        
        # Get caller information
        frame = inspect.currentframe()
        try:
            # Go back one frame to get the actual caller (not this function)
            caller_frame = frame.f_back
            caller_filename = caller_frame.f_code.co_filename
            caller_line = caller_frame.f_lineno
            caller_function = caller_frame.f_code.co_name
            
            # Get just the filename without full path
            filename = os.path.basename(caller_filename)
            
            # Get module name (remove .py extension)
            module_name = os.path.splitext(filename)[0]
            
            # Format the caller info
            caller_info = f"[{module_name}:{caller_line}]"
            
            # Call original print with caller info prepended
            original_print(caller_info, *args, **kwargs)
            
        except Exception as e:
            # If anything goes wrong, fall back to original print
            original_print("[PRINT_INTERCEPTOR_ERROR]", *args, **kwargs)
        finally:
            del frame
    
    def intercepted_eprint(*args, **kwargs):
        """
        Custom eprint function for exception/error prints - adds [ERROR] prefix
        Can be toggled to go into the void (not show)
        """
        # Check if error prints are enabled
        if not _PRINT_CONFIG['show_error_prints']:
            return  # Send to void - do nothing
            
        # Get caller information
        frame = inspect.currentframe()
        try:
            # Go back one frame to get the actual caller (not this function)
            caller_frame = frame.f_back
            caller_filename = caller_frame.f_code.co_filename
            caller_line = caller_frame.f_lineno
            caller_function = caller_frame.f_code.co_name
            
            # Get just the filename without full path
            filename = os.path.basename(caller_filename)
            
            # Get module name (remove .py extension)
            module_name = os.path.splitext(filename)[0]
            
            # Format the caller info with ERROR prefix
            caller_info = f"[ERROR {module_name}:{caller_line}]"
            
            # Call original print with error caller info prepended
            original_print(caller_info, *args, **kwargs)
            
        except Exception as e:
            # If anything goes wrong, fall back to original print
            original_print("[EPRINT_INTERCEPTOR_ERROR]", *args, **kwargs)
        finally:
            del frame
    
    # Replace the built-in print function
    builtins.print = intercepted_print
    
    # Add eprint as a global builtin function
    builtins.eprint = intercepted_eprint
    
    return original_print


def restore_original_print(original_print):
    """
    Restores the original print function
    """
    builtins.print = original_print


# Alternative handler for more advanced control
def custom_print_handler(message_parts, caller_file, caller_module, caller_function, line_number):
    """
    Central handler for all print calls - modify this to control print behavior
    
    Args:
        message_parts: Tuple of all arguments passed to print
        caller_file: Full path to the file that called print
        caller_module: Module name (filename without .py)
        caller_function: Function name that called print
        line_number: Line number where print was called
    """
    # For now, just print with caller info
    caller_info = f"[{caller_module}:{line_number}]"
    print(caller_info, *message_parts)
    
    # Future options you can implement here:
    # - Log to file based on module
    # - Filter out specific modules
    # - Send to different loggers
    # - Suppress prints from certain files
    # - etc.
