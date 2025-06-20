#!/usr/bin/env python3
import os

def get_tool_url(tool_path):
    git_config_path = os.path.join(tool_path, '.git', 'config')
    if os.path.exists(git_config_path):
        with open(git_config_path, 'r') as f:
            for line in f:
                if 'url' in line:
                    return line.split('=')[1].strip()

    #print("Git URL not found: {}".format(tool_path))
    return ''

def generate_md(tool_path):
    tool_name = os.path.basename(tool_path)
    category_name = os.path.basename(os.path.dirname(tool_path))
    tool_url = get_tool_url(tool_path)
    
    md_content = f"""---
description: |
  TODO
command: |
  {tool_name} {tool_url}
code: |
  TODO

items:
  - {category_name}

"""
    if tool_url:
        md_content += f"""
references:
  - {tool_url}
"""
    md_content += "---"

    
    return md_content

def process_directory(directory):
    for item in os.listdir(directory):
        item_path = os.path.join(directory, item)
        if os.path.isdir(item_path):
            #if os.path.isfile(os.path.join(item_path, ".git/config")):
            item_name = str(item).lower()
            output_path = os.path.join('/tmp/tools', f'{item_name}.md')
            if os.path.exists(output_path):
                print(f"\n====================\nWarning: File {output_path} already exists. Duplicate found in: {os.path.abspath(item_path)}")
                print("\n\n")
                os.system(f"cat {output_path} | grep -A1 command | tr -d '\n' ")
                print(" ")
                os.system(f"cat {output_path} | grep -A1 items | tr -d '\n' ")
                print("\n------\n")
                print(get_tool_url(item_path))
                print(" ")
                print(os.path.basename(os.path.dirname(item_path)))

            else:
                md_content = generate_md(item_path)
                with open(output_path, 'w') as f:
                    f.write(md_content)
        elif os.path.isdir(item_path):
            process_directory(item_path)

def main():
    # tmp dir for processing
    if not os.path.exists("/tmp/tools"):
        os.mkdir("/tmp/tools")


    # tools dir 
    tools_dir = "/mnt/Data/Tools"
    url_dict = {}
    #current_dir = os.getcwd()
    for item in os.listdir(tools_dir):
        item_path = os.path.join(tools_dir, item)
        if os.path.isdir(item_path):
            process_directory(item_path)


    for url, directories in url_dict.items():
        if len(directories) > 1:
            print(f"Multiple directories have the same URL: {url}")
            for directory in directories:
                print(f"- {os.path.abspath(directory)}")

if __name__ == "__main__":
    main()
