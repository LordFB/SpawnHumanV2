#!/usr/bin/python

import argparse
import sys
import json
import os

fake_entry = {
        "author": "",
        "category": "",
        "changed": "",
        "created": "",
        "description": "",
        "license": "CC0",
        "original_author": "",
        "original_source": "",
        "source": "",
        "thumbnail": "",
        "type": "target"
    }

def main():
    parser = argparse.ArgumentParser(description='Generate fake pack info entries')
    
    # Required argument
    parser.add_argument('set', type=str, help='Set name (required)')
    
    # Optional arguments
    parser.add_argument('--author', type=str, default='', help='Author name (optional)')
    parser.add_argument('--category', type=str, default='', help='Category (optional)')
    parser.add_argument('--description', type=str, default='', help='Description (optional)')
    
    args = parser.parse_args()
    
    # Update fake_entry with provided values
    if args.author:
        fake_entry['author'] = args.author
    if args.category:
        fake_entry['category'] = args.category
    if args.description:
        fake_entry['description'] = args.description
    
    # Find parent directory of this script
    root_dir = os.path.dirname(os.path.abspath(__file__))
    asset_dir = os.path.join(root_dir, "..", 'assets')

    set_dir = os.path.abspath(os.path.join(asset_dir, args.set))
    
    # Check if "set" matches a directory in the assets directory
    if not os.path.isdir(set_dir):
        print(f'Error: No directory found for set "{args.set}" in the assets directory. Expected path {set_dir}."')
        sys.exit(1)
    
    
    # Recurse through set_dir and find all files ending with ".target"
    target_files = []
    for root, _, files in os.walk(set_dir):
        for file in files:
            if file.endswith('.target'):
                target_files.append(os.path.join(root, file))
    
    # Create fake pack info entries for each target file
    pack_info = {}
    for target_file in target_files:
        name = os.path.splitext(os.path.basename(target_file))[0]
        pack_info[name] = fake_entry.copy()
    
    # Save pack info to a JSON file
    output_file = os.path.join(set_dir, "packs", args.set + ".json") 
    with open(output_file, 'w') as outfile:
        json.dump(pack_info, outfile, indent=4)
    
    print(f'Generated fake pack info entries for set "{args.set}" in {output_file}')

if __name__ == "__main__":
    main()