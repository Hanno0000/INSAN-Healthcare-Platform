import os
import glob
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    original_content = "".join(lines)

    # 1. Add Purpose and Document Philosophy if missing
    if not any(re.match(r'^#+\s+Purpose', line, re.IGNORECASE) for line in lines):
        # find second '---' for end of yaml
        yaml_end_idx = -1
        dash_count = 0
        for i, line in enumerate(lines):
            if line.strip() == '---':
                dash_count += 1
                if dash_count == 2:
                    yaml_end_idx = i
                    break
        
        if yaml_end_idx != -1:
            lines.insert(yaml_end_idx + 1, "\n# Purpose\n[TBD]\n\n# Document Philosophy\n[TBD]\n")

    # 2. Split Vision & Mission
    for i, line in enumerate(lines):
        if re.search(r'^#+\s+.*Vision\s*&\s*Mission', line, re.IGNORECASE):
            # Extract heading prefix (e.g., '### ', '## 1.3 ')
            prefix_match = re.match(r'^(#+\s+)(.*?)Vision\s*&\s*Mission', line, re.IGNORECASE)
            if prefix_match:
                hashes = prefix_match.group(1)
                prefix_num = prefix_match.group(2) # e.g. '1.3 '
                
                new_lines = f"{hashes}{prefix_num}Vision\n\n{hashes}{prefix_num}Mission\n[TBD]\n"
                lines[i] = new_lines

    # 3. Center specific sections (only if in centers)
    is_center = 'centers' in filepath.replace('\\', '/')
    if is_center:
        if not any(re.match(r'^#+\s+Center Features', line, re.IGNORECASE) for line in lines):
            # Insert before Operations or Marketing Intelligence
            insert_idx = -1
            for i, line in enumerate(lines):
                if re.search(r'^#+\s+.*Operations', line, re.IGNORECASE) or re.search(r'^#+\s+.*Marketing Intelligence', line, re.IGNORECASE):
                    insert_idx = i
                    break
            
            if insert_idx != -1:
                # Find the hash level of the previous section to match
                lines.insert(insert_idx, "\n### Center Features\n[TBD]\n\n### Center Services\n[TBD]\n\n")
            else:
                lines.append("\n### Center Features\n[TBD]\n\n### Center Services\n[TBD]\n")

    # 4. AI & Documentation missing fields
    # Find AI & Documentation section
    ai_idx = -1
    for i, line in enumerate(lines):
        if re.search(r'^#+\s+.*AI\s*&\s*Documentation', line, re.IGNORECASE):
            ai_idx = i
            break
            
    if ai_idx != -1:
        missing_ai_fields = [
            "Relationship With Campaign Cards",
            "Relationship With Other Documentation",
            "Maintenance Policy",
            "Versioning Philosophy",
            "Future Expansion Areas",
            "Final Strategic Reminder",
            "Related Knowledge"
        ]
        
        # Check which ones are missing
        missing_to_add = []
        for field in missing_ai_fields:
            if not any(re.search(r'^#+\s+.*' + re.escape(field), line, re.IGNORECASE) for line in lines[ai_idx:]):
                missing_to_add.append(field)
                
        if missing_to_add:
            append_str = "\n"
            for field in missing_to_add:
                append_str += f"### {field}\n[TBD]\n\n"
            lines.append(append_str)


    new_content = "".join(lines)
    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

# Find all markdown files in centers and departments
centers_dir = r"J:\My Drive\Insan\business\knowledge\centers"
departments_dir = r"J:\My Drive\Insan\business\knowledge\departments"

for root, _, files in os.walk(centers_dir):
    for f in files:
        if f.endswith('.md'):
            process_file(os.path.join(root, f))

for root, _, files in os.walk(departments_dir):
    for f in files:
        if f.endswith('.md'):
            process_file(os.path.join(root, f))

print("Done.")
