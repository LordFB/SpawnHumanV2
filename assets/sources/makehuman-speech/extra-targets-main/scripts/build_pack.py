#!/usr/bin/python

import argparse
import sys
import os
import zipfile

def main():
    parser = argparse.ArgumentParser(description='Generate fake pack info entries')    
    parser.add_argument('set', type=str, help='Set name (required)')    
    args = parser.parse_args()
    
    
    # Find parent directory of this script
    root_dir = os.path.dirname(os.path.abspath(__file__))
    asset_dir = os.path.join(root_dir, "..", 'assets')
    set_dir = os.path.abspath(os.path.join(asset_dir, args.set))
    pack_dir = os.path.join(root_dir, "..", 'dist')
    pack_file = os.path.abspath(os.path.join(pack_dir, args.set + ".zip"))
        
    # Check if "set" matches a directory in the assets directory
    if not os.path.isdir(set_dir):
        print(f'Error: No directory found for set "{args.set}" in the assets directory. Expected path {set_dir}."')
        sys.exit(1)
    
    # Create pack_dir if it doesn't exist
    if not os.path.exists(pack_dir):
        os.makedirs(pack_dir)
    
    # Create a zip of the directories in the set_dir
    with zipfile.ZipFile(pack_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(set_dir):
            for file in files:                
                zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), set_dir))
        
    print(f'Generated asset pack in {pack_file}')

if __name__ == "__main__":
    main()