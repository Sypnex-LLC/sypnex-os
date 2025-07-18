from virtual_file_manager import VirtualFileManager

vfm = VirtualFileManager()
items = vfm.list_directory('/nodes')
print('Files in /nodes:')
print(f'Found {len(items)} items')
for item in items:
    print(f'  {item["name"]} ({item["is_directory"] and "dir" or "file"})')

# Also check if we can read one of the files
if items:
    first_file = items[0]
    if not first_file['is_directory']:
        try:
            content = vfm.read_file(f'/nodes/{first_file["name"]}')
            print(f'\nContent of {first_file["name"]}:')
            print(content['content'].decode('utf-8')[:200] + '...')
        except Exception as e:
            print(f'Error reading file: {e}') 