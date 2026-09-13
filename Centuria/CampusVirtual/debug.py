from bs4 import BeautifulSoup

filepath = r'C:\Users\HP 250 G10\Documents\GITHUT\Centuria\TIC\Portal_TIC_Final\Materiales_HTML_Sabados\clase_03.html'
with open(filepath, 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')
section = soup.find('div', class_='section-card border-def')
print('section found:', section is not None)
mb5 = section.find('div', class_='mb-5') if section else None
print('mb5 found:', mb5 is not None)
if mb5:
    ps = mb5.find_all('p')
    ols = mb5.find_all('ol')
    print('p count:', len(ps))
    print('ol count:', len(ols))
    for p in ps[:5]:
        text = p.get_text(strip=True)
        print(f'  p: {text[:80]}')
    for ol in ols:
        lis = ol.find_all('li')
        print(f'  ol has {len(lis)} li items')
        for li in lis[:3]:
            text = li.get_text(strip=True)
            print(f'    li: {text[:80]}')
