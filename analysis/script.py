import re

def analyze_logs(log_file1, log_file2):
    data1 = parse_log_file(log_file1)
    data2 = parse_log_file(log_file2)

    avg_cpu1 = sum(data1['cpu']) / len(data1['cpu']) if data1['cpu'] else 0
    avg_mem1 = sum(data1['mem']) / len(data1['mem']) if data1['mem'] else 0
    total_net_in1 = data1['net_in'][-1] - data1['net_in'][0] if data1['net_in'] else 0
    total_net_out1 = data1['net_out'][-1] - data1['net_out'][0] if data1['net_out'] else 0

    avg_cpu2 = sum(data2['cpu']) / len(data2['cpu']) if data2['cpu'] else 0
    avg_mem2 = sum(data2['mem']) / len(data2['mem']) if data2['mem'] else 0
    total_net_in2 = data2['net_in'][-1] - data2['net_in'][0] if data2['net_in'] else 0
    total_net_out2 = data2['net_out'][-1] - data2['net_out'][0] if data2['net_out'] else 0

    print("Key-Based Batching ({}):".format(log_file1))
    print("  Avg CPU: {:.2f}%".format(avg_cpu1))
    print("  Avg Mem: {:.2f}MiB".format(avg_mem1))
    print("  Total Net In: {:.2f}kB".format(total_net_in1))
    print("  Total Net Out: {:.2f}MB".format(total_net_out1))

    print("Default Batching ({}):".format(log_file2))
    print("  Avg CPU: {:.2f}%".format(avg_cpu2))
    print("  Avg Mem: {:.2f}MiB".format(avg_mem2))
    print("  Total Net In: {:.2f}kB".format(total_net_in2))
    print("  Total Net Out: {:.2f}MB".format(total_net_out2))

    print("\nComparison:")
    print("  CPU Usage: Key-Based: {:.2f}%, Default: {:.2f}%".format(avg_cpu1, avg_cpu2))
    print("  Memory Usage: Key-Based: {:.2f}MiB, Default: {:.2f}MiB".format(avg_mem1, avg_mem2))
    print("  Total Network In: Key-Based: {:.2f}kB, Default: {:.2f}kB".format(total_net_in1, total_net_in2))
    print("  Total Network Out: Key-Based: {:.2f}MB, Default: {:.2f}MB".format(total_net_out1, total_net_out2))


def parse_log_file(log_file):
    cpu_values = []
    mem_values = []
    net_in_values = []
    net_out_values = []

    with open(log_file, 'r') as f:
        for line in f:
            match = re.search(r"CPU=([\d.]+)%.*MEM=([\d.]+)(MiB|GiB) / .*NET=([\d.]+)(B|kB|MB|GB) / ([\d.]+)(B|kB|MB|GB)", line)
            if match:
                cpu = float(match.group(1))
                mem = float(match.group(2))
                mem_unit = match.group(3)
                net_in = float(match.group(4))
                net_in_unit = match.group(5)
                net_out = float(match.group(6))
                net_out_unit = match.group(7)

                if mem_unit == "GiB":
                    mem *= 1024  # Convert GiB to MiB
                if net_in_unit == "B":
                    net_in /= 1024
                elif net_in_unit == "MB":
                    net_in *= 1024
                elif net_in_unit == "GB":
                    net_in *= 1024 * 1024

                if net_out_unit == "B":
                    net_out /= (1024 * 1024)
                elif net_out_unit == "kB":
                    net_out /= 1024
                elif net_out_unit == "GB":
                    net_out *= 1024

                cpu_values.append(cpu)
                mem_values.append(mem)
                net_in_values.append(net_in)
                net_out_values.append(net_out)

    return {'cpu': cpu_values, 'mem': mem_values, 'net_in': net_in_values, 'net_out': net_out_values}


if __name__ == "__main__":
    log_file1 = "container_1.log"
    log_file2 = "container_2.log"
    analyze_logs(log_file1, log_file2)
