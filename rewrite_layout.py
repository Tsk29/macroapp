import re

with open('frontend/app/page.tsx', 'r') as f:
    content = f.read()

# Replace the emoji in the header
content = re.sub(r'<span className="text-lg">🥗</span>', r'<Leaf className="h-5 w-5 text-white" strokeWidth={2.5} />', content)

# Also import Leaf
if 'Leaf' not in content:
    content = content.replace('import { ', 'import { Leaf, ')

# Replace the login icon
content = re.sub(r'<span className="text-3xl">🥗</span>', r'<Leaf className="h-8 w-8 text-white" strokeWidth={2.5} />', content)

# Now restructure the layout
# Find the start of Main Grid
main_start_idx = content.find('{/* ── Main Grid ── */}')
if main_start_idx == -1:
    print("Main Grid not found")
    exit(1)

main_end_idx = content.find('{/* ── Custom Food Modal ── */}')
if main_end_idx == -1:
    main_end_idx = content.find('  );\n}\n\n// Helper')

main_content = content[main_start_idx:main_end_idx]

# Extract sections
def extract_section(start_marker, end_marker):
    start = main_content.find(start_marker)
    if start == -1: return ""
    if end_marker:
        end = main_content.find(end_marker, start)
        if end == -1: end = len(main_content)
    else:
        end = len(main_content)
    return main_content[start:end]

macro_rings = extract_section('{/* Macro overview rings */}', '{/* Daily Diary */}')
daily_diary = extract_section('{/* Daily Diary */}', '{/* ── Rewe Shopping List (live, from current generated recipe) ── */}')
if not daily_diary:
    daily_diary = extract_section('{/* Daily Diary */}', '{/* ══ RIGHT PANEL ══ */}')
rewe_live = extract_section('{/* ── Rewe Shopping List (live, from current generated recipe) ── */}', '{/* ══ RIGHT PANEL ══ */}')
weekly_comp = extract_section('{/* Weekly Compliance Bar Chart */}', '{/* Build tab */}')
build_tab = extract_section('{/* Build tab */}', '{/* Loading state */}')
loading_state = extract_section('{/* Loading state */}', '{/* Recipe / Meal Plan Result */}')
recipe_result = extract_section('{/* Recipe / Meal Plan Result */}', '          </div>\n        </div>\n      )}')

# If we couldn't extract something cleanly, print error
if not build_tab: print("Failed to extract build tab")
if not recipe_result: print("Failed to extract recipe result")

new_main = f"""      {{/* ── Main Content ── */}}
      <main style={{{{ maxWidth: '1360px', margin: '10px auto 24px', padding: '0 12px' }}}}>
        
        {{/* ══ BUILD TAB ══ */}}
        {{activeTab === 'build' && (
          <div style={{{{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '12px' }}}}>
            <div style={{{{ display: 'flex', flexDirection: 'column', gap: '12px' }}}}>
{build_tab}
            </div>
            <div style={{{{ display: 'flex', flexDirection: 'column', gap: '12px' }}}}>
{loading_state}
{recipe_result}
            </div>
          </div>
        )}}

        {{/* ══ DIARY TAB ══ */}}
        {{activeTab === 'diary' && (
          <div style={{{{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '12px' }}}}>
            <div style={{{{ display: 'flex', flexDirection: 'column', gap: '12px' }}}}>
{daily_diary}
            </div>
            <div style={{{{ display: 'flex', flexDirection: 'column', gap: '12px' }}}}>
{rewe_live}
            </div>
          </div>
        )}}

        {{/* ══ STATS TAB ══ */}}
        {{activeTab === 'stats' && (
          <div style={{{{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}}}>
            <div style={{{{ display: 'flex', flexDirection: 'column', gap: '12px' }}}}>
{macro_rings}
            </div>
            <div style={{{{ display: 'flex', flexDirection: 'column', gap: '12px' }}}}>
{weekly_comp}
            </div>
          </div>
        )}}
      </main>
"""

new_content = content[:main_start_idx] + new_main + content[main_end_idx:]

with open('frontend/app/page.tsx', 'w') as f:
    f.write(new_content)

print("Refactored successfully")
