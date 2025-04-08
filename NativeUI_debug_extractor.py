import re

LOG_FILE = "./RuntimeLogs/FTOptixRuntime.syn1.log"
OUTPUT_FILE = "output13.md"


# Formats a numerical value to remove unnecessary trailing zeros
def formatted_value(v):
    return f"{v:.2f}".rstrip('0').rstrip('.') if v and '.' in str(v) else f"{int(v)}" if v else "0"


# Parses the log file and extracts page load performance data
def parse_log_file(log_file):
    pages_data = {}  # Dictionary to store all page data
    page_stack = []  # Stack to track page hierarchy
    page_counter = {}  # Counter to handle duplicate page names
    capturing_nested = False  # Track if we are inside a nested page

    with open(log_file, 'r', encoding='utf-8') as file:
        for line in file:
            process_line(line, pages_data, page_stack, page_counter, capturing_nested)

    return list(pages_data.values())  # Return all stored page instances


# Processes a single line of the log file, updating page tracking and performance metrics
def process_line(line, pages_data, page_stack, page_counter, capturing_nested):
    try:
        root_match = re.search(r'AddItem begin \(root\);;([^;]+)', line)
        nested_match = re.search(r'AddItem begin \(nested root\);;([^;]+)', line)
        end_root_match = re.search(r'AddItem end \(root\);;([^;]+)', line)
        end_nested_match = re.search(r'AddItem end \(nested root\);;([^;]+)', line)

        if root_match:
            page_name = root_match.group(1).split('/')[-1]
            unique_name = get_unique_page_name(page_name, page_counter)
            pages_data[unique_name] = create_page_instance(page_name)
            page_stack.append(unique_name)
            capturing_nested = False  # Ensure we capture root-level data

        elif nested_match:
            page_name = nested_match.group(1).split('/')[-1]
            unique_name = get_unique_page_name(page_name, page_counter)
            pages_data[unique_name] = create_page_instance(page_name)
            page_stack.append(unique_name)
            capturing_nested = True  # Start capturing nested-level data

        add_performance_data(line, pages_data, page_stack, capturing_nested)

        if end_nested_match:
            nested_page = end_nested_match.group(1).split('/')[-1]
            if page_stack and page_stack[-1].startswith(nested_page):
                page_stack.pop()  # Remove the nested page only when it ends

        if end_root_match:
            root_page = end_root_match.group(1).split('/')[-1]
            if page_stack and page_stack[-1].startswith(root_page):
                page_stack.pop()  # Remove the root only when it ends

        add_item_match = re.search(r'AddItem,(\d+)', line)
        if add_item_match:
            # last_dict = list(pages_data.values())[-1]
            # last_dict["total_load_time"] = int(add_item_match.group(1))
            for last_dict in reversed(pages_data.values()):
                if last_dict.get("nested") is False:  # Ensure "nested" exists and is explicitly False
                    last_dict["total_load_time"] = int(add_item_match.group(1))
                    break  # Stop once the correct dictionary is found

    except ValueError:
        pass  # Ignore value errors


# Generates a unique page name to avoid conflicts
def get_unique_page_name(page_name, page_counter):
    if page_name not in page_counter:
        page_counter[page_name] = 0
    page_counter[page_name] += 1
    return f"{page_name}_{page_counter[page_name]}"


# Creates a new page instance dictionary to store performance metrics
def create_page_instance(page_name):
    return {
        "page_name": page_name,
        "total_load_time": 0,
        "create_nodes": 0,
        "ui_objects": 0,
        "nodes_time": 0,
        "ui_time": 0,
        "entries": [],
        "nested": False
    }


# Extracts and updates performance metrics from the log line
def add_performance_data(line, pages_data, page_stack, capturing_nested):
    if not page_stack:
        return  # No active page to update

    current_page = page_stack[-1]

    match = re.search(r'Start ([^,]+),(\d+),(\d+),([\d.]+)', line.strip())
    if match:
        module_name = match.group(1)
        benchmark1 = int(match.group(2))
        benchmark2 = int(match.group(3))
        if benchmark1 > 0 or benchmark2 > 0:  # Only store non-zero benchmarks
            pages_data[current_page]["entries"].append((module_name, benchmark1, benchmark2))

    create_match = re.search(r'Create nodes,(\d+),(\d+),([\d.]+),UI objects,(\d+),(\d+),([\d.]+)', line)
    if create_match:
        pages_data[current_page]["create_nodes"] = int(create_match.group(2))
        pages_data[current_page]["nodes_time"] = float(create_match.group(1))
        pages_data[current_page]["ui_objects"] = int(create_match.group(5))
        pages_data[current_page]["ui_time"] = float(create_match.group(4))

    if capturing_nested:
        pages_data[current_page]["nested"] = True


# Writes the extracted performance data to a markdown file
def write_output(output_file, page_instances_dict):
    with open(output_file, 'w', encoding='utf-8') as output:
        output.write("# Page Load Timing Report\n\n")

        for instance in page_instances_dict:
            clean_page_name = instance['page_name'].rsplit('_', 1)[0]  # Remove numeric suffix

            if instance['nested']:
                output.write(f"### {clean_page_name}\n\n")
            else:
                output.write(f"## {clean_page_name}\n\n")
                output.write(f"Total load time: {formatted_value(instance['total_load_time'])} ms\n\n")
            output.write(f"- Nodes: {instance['create_nodes']} ({formatted_value(instance['nodes_time'])} ms)\n")
            output.write(f"- UI Objects: {instance['ui_objects']} ({formatted_value(instance['ui_time'])} ms)\n\n")

            if instance["entries"]:
                output.write("| Module Name | Total Load Time (ms) | Number of Items |\n")
                output.write("| --- | --- | --- |\n")
                for entry in instance["entries"]:
                    module_name, benchmark1, benchmark2 = entry
                    output.write(f"| {module_name} | {formatted_value(benchmark1)} | {formatted_value(benchmark2)} |\n")
            output.write("\n")


if __name__ == "__main__":
    page_instances = parse_log_file(LOG_FILE)
    write_output(OUTPUT_FILE, page_instances)
