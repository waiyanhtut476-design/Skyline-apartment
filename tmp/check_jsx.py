import re

with open('src/components/BillCalculator.tsx') as f:
    lines = f.readlines()

content = ''.join(lines[548:])

# Strip string literals and comments
def sanitize_jsx(code):
    res = []
    i = 0
    length = len(code)
    in_str = None
    
    while i < length:
        ch = code[i]
        nxt = code[i+1] if i+1 < length else ''
        
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
            i += 1
            continue
            
        if ch in ('"', "'", '`'):
            in_str = ch
            i += 1
            continue
            
        if ch == '/' and nxt == '/':
            while i < length and code[i] != '\n':
                i += 1
            continue
            
        if ch == '/' and nxt == '*':
            i += 2
            while i < length - 1 and not (code[i] == '*' and code[i+1] == '/'):
                i += 1
            i += 2
            continue
            
        res.append(ch)
        i += 1
    return ''.join(res)

sanitized = sanitize_jsx(content)

stack = []
for match in re.finditer(r'<(/)?([a-zA-Z0-9_\-]+)([^>]*?)(/+)?>', sanitized):
    is_close = match.group(1) == '/'
    tag_name = match.group(2)
    attrs = match.group(3)
    is_self_close = bool(match.group(4)) or tag_name in ('input', 'img', 'br', 'hr', 'meta')
    
    if tag_name in ('string', 'number', 'boolean', 'any', 'void', 'React', 'T'):
        continue
        
    line_no = content[:match.start()].count('\n') + 549
    
    if is_close:
        if not stack:
            print(f'Error: Unmatched closing tag </{tag_name}> at line {line_no}')
        else:
            top_tag, top_line = stack.pop()
            if top_tag != tag_name:
                print(f'Mismatch: expected </{top_tag}> (from line {top_line}) but found </{tag_name}> at line {line_no}')
                # put back to continue checking
                stack.append((top_tag, top_line))
    elif is_self_close:
        pass
    else:
        stack.append((tag_name, line_no))

print('Finished tag check. Unclosed tags remaining:')
for t, l in stack:
    print(f'  <{t}> at line {l}')
