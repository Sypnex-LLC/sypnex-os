{
    "id": "text_editor",
    "name": "Text Editor",
    "description": "A simple text editor for creating and editing text files in the virtual file system",
    "icon": "fas fa-edit",
    "keywords": ["text", "editor", "file", "edit", "write"],
    "author": "Sypnex OS",
    "version": "1.0.1",
    "type": "user_app",
    "scripts": [
        "main.js"
    ],
    "settings": [
        {
            "key": "AUTO_SAVE_INTERVAL",
            "name": "Auto Save Interval (s)",
            "type": "number",
            "value": 30,
            "description": "Auto save content every N seconds (0 = disabled)"
        },
        {
            "key": "FONT_SIZE",
            "name": "Font Size",
            "type": "number",
            "value": 14,
            "description": "Text editor font size in pixels"
        },
        {
            "key": "TAB_SIZE",
            "name": "Tab Size",
            "type": "number",
            "value": 4,
            "description": "Number of spaces for tab indentation"
        },
        {
            "key": "TERMINAL_ENABLED",
            "name": "Integrated Terminal",
            "type": "boolean",
            "value": false,
            "description": "Show integrated terminal by default"
        }
    ]
} 