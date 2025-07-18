#!/usr/bin/env python3
"""
System Boot Manager - Handles system initialization and boot-time resets
Manages resetting various system values when the OS boots up
"""

import sqlite3
import time
from datetime import datetime
from typing import Dict, Any

class SystemBootManager:
    """
    Manages system boot initialization and reset operations.
    Handles resetting various system values that should be cleared on boot.
    """
    
    def __init__(self, db_path: str = "data/user_preferences.db"):
        self.db_path = db_path
        self.boot_time = time.time()
        self.boot_timestamp = datetime.now().isoformat()
        
    def initialize_system(self):
        """Initialize the system on boot - reset various counters and timers"""
        print("🔄 System Boot Manager: Initializing system...")
        
        # Reset WebSocket server uptime
        self.reset_websocket_uptime()
        
        # Reset other system values as needed
        self.reset_system_counters()
        
        print(f"✅ System Boot Manager: Initialization complete at {self.boot_timestamp}")
        
    def reset_websocket_uptime(self):
        """Reset WebSocket server uptime to 0 on boot"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create system_boot table if it doesn't exist
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS system_boot (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        boot_time REAL NOT NULL,
                        boot_timestamp TEXT NOT NULL,
                        websocket_start_time REAL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Insert new boot record
                cursor.execute('''
                    INSERT INTO system_boot (boot_time, boot_timestamp, websocket_start_time)
                    VALUES (?, ?, ?)
                ''', (self.boot_time, self.boot_timestamp, self.boot_time))
                
                conn.commit()
                print(f"✅ WebSocket uptime reset - new boot time: {self.boot_timestamp}")
                
        except Exception as e:
            print(f"❌ Error resetting WebSocket uptime: {e}")
    
    def reset_system_counters(self):
        """Reset various system counters that should be cleared on boot"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create system_counters table if it doesn't exist
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS system_counters (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        counter_name TEXT UNIQUE NOT NULL,
                        value INTEGER DEFAULT 0,
                        reset_on_boot BOOLEAN DEFAULT 1,
                        last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Reset counters that should be reset on boot
                cursor.execute('''
                    UPDATE system_counters 
                    SET value = 0, last_reset = CURRENT_TIMESTAMP 
                    WHERE reset_on_boot = 1
                ''')
                
                conn.commit()
                print("✅ System counters reset")
                
        except Exception as e:
            print(f"❌ Error resetting system counters: {e}")
    
    def get_websocket_uptime(self) -> int:
        """Get actual WebSocket server uptime since last boot"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get the most recent boot time
                cursor.execute('''
                    SELECT websocket_start_time FROM system_boot 
                    ORDER BY created_at DESC LIMIT 1
                ''')
                
                result = cursor.fetchone()
                if result:
                    start_time = result[0]
                    uptime = int(time.time() - start_time)
                    return max(0, uptime)  # Ensure non-negative
                else:
                    # Fallback to current boot time if no record found
                    return int(time.time() - self.boot_time)
                    
        except Exception as e:
            print(f"❌ Error getting WebSocket uptime: {e}")
            # Fallback to current boot time
            return int(time.time() - self.boot_time)
    
    def get_boot_info(self) -> Dict[str, Any]:
        """Get information about the current boot"""
        return {
            'boot_time': self.boot_time,
            'boot_timestamp': self.boot_timestamp,
            'current_uptime': int(time.time() - self.boot_time),
            'websocket_uptime': self.get_websocket_uptime()
        }
    
    def add_system_counter(self, counter_name: str, reset_on_boot: bool = True):
        """Add a new system counter that can be reset on boot"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO system_counters (counter_name, reset_on_boot)
                    VALUES (?, ?)
                ''', (counter_name, reset_on_boot))
                
                conn.commit()
                print(f"✅ Added system counter: {counter_name}")
                
        except Exception as e:
            print(f"❌ Error adding system counter: {e}")
    
    def increment_counter(self, counter_name: str, increment: int = 1) -> int:
        """Increment a system counter and return new value"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get current value
                cursor.execute('''
                    SELECT value FROM system_counters WHERE counter_name = ?
                ''', (counter_name,))
                
                result = cursor.fetchone()
                if result:
                    new_value = result[0] + increment
                else:
                    new_value = increment
                
                # Update or insert
                cursor.execute('''
                    INSERT OR REPLACE INTO system_counters (counter_name, value)
                    VALUES (?, ?)
                ''', (counter_name, new_value))
                
                conn.commit()
                return new_value
                
        except Exception as e:
            print(f"❌ Error incrementing counter {counter_name}: {e}")
            return 0
    
    def get_counter(self, counter_name: str) -> int:
        """Get current value of a system counter"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT value FROM system_counters WHERE counter_name = ?
                ''', (counter_name,))
                
                result = cursor.fetchone()
                return result[0] if result else 0
                
        except Exception as e:
            print(f"❌ Error getting counter {counter_name}: {e}")
            return 0

# Global instance
_system_boot_manager = None

def get_system_boot_manager() -> SystemBootManager:
    """Get the global system boot manager instance"""
    global _system_boot_manager
    if _system_boot_manager is None:
        _system_boot_manager = SystemBootManager()
    return _system_boot_manager 