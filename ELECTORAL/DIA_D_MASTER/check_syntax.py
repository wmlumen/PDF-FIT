import py_compile
try:
    py_compile.compile('app.py', doraise=True)
    print('Syntax OK - app.py compiles correctly')
except py_compile.PyCompileError as e:
    print(f'Syntax Error: {e}')