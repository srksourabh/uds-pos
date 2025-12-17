#!/usr/bin/env python3
"""
Automated Bulk Responsive Update Script
Updates all 39 pages in UDS-POS with responsive utility classes
"""

import os
import re
from pathlib import Path

# Define all replacements in order
REPLACEMENTS = [
    # 1. CONTAINERS
    (r'className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"', 'className="container-responsive section-spacing"'),
    (r'className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"', 'className="container-responsive"'),
    (r'className="p-6 sm:p-8"', 'className="p-responsive"'),
    (r'className="p-3 sm:p-4 md:p-6 pb-8"', 'className="container-responsive section-spacing"'),
    
    # 2. HEADINGS
    (r'className="text-3xl font-bold text-gray-900', 'className="heading-1-responsive text-gray-900'),
    (r'className="text-3xl font-bold', 'className="heading-1-responsive'),
    (r'className="text-2xl sm:text-3xl font-bold text-gray-900', 'className="heading-1-responsive text-gray-900'),
    (r'className="text-2xl sm:text-3xl font-bold', 'className="heading-1-responsive'),
    (r'className="text-2xl font-bold text-gray-900', 'className="heading-2-responsive text-gray-900'),
    (r'className="text-2xl font-bold', 'className="heading-2-responsive'),
    (r'className="text-xl font-bold text-gray-900', 'className="heading-3-responsive text-gray-900'),
    (r'className="text-xl font-bold', 'className="heading-3-responsive'),
    (r'className="text-lg sm:text-xl font-bold', 'className="heading-3-responsive'),
    (r'className="text-lg font-semibold text-gray-900', 'className="heading-3-responsive text-gray-900'),
    (r'className="text-lg font-semibold', 'className="heading-3-responsive'),
    
    # 3. CARDS & CONTAINERS
    (r'className="bg-white rounded-lg shadow-sm border border-gray-200 p-6', 'className="card-responsive'),
    (r'className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6', 'className="card-responsive'),
    (r'className="bg-white rounded-lg shadow border border-gray-200 p-6', 'className="card-responsive'),
    (r'className="bg-white rounded-xl shadow-sm border border-gray-200 p-6', 'className="card-responsive'),
    (r'className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6 p-3 sm:p-4"', 'className="card-responsive mb-responsive"'),
    
    # 4. GRIDS
    (r'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6', 'className="grid-responsive-4'),
    (r'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', 'className="grid-responsive-3'),
    (r'className="grid grid-cols-1 md:grid-cols-2 gap-6', 'className="grid-responsive-2'),
    (r'className="grid grid-cols-1 sm:grid-cols-2 gap-6', 'className="grid-responsive-2'),
    (r'className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"', 'className="grid-responsive-2"'),
    (r'className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4', 'className="grid-responsive-5'),
    (r'className="grid grid-cols-4 gap-6', 'className="stats-grid'),
    (r'className="grid grid-cols-3 gap-6', 'className="grid-responsive-3'),
    (r'className="grid grid-cols-2 gap-6', 'className="grid-responsive-2'),
    (r'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"', 'className="grid-responsive-4"'),
    
    # 5. BUTTONS - Primary
    (r'className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700', 'className="flex items-center gap-2 btn-primary-responsive'),
    (r'className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700', 'className="flex items-center gap-2 btn-primary-responsive'),
    (r'className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700', 'className="flex items-center gap-2 btn-primary-responsive'),
    (r'className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700', 'className="btn-primary-responsive'),
    (r'className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700', 'className="btn-primary-responsive'),
    (r'className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base"', 'className="btn-primary-responsive disabled:opacity-50"'),
    (r'className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"', 'className="btn-primary-responsive"'),
    
    # 6. BUTTONS - Green (Import/Add)
    (r'className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm sm:text-base"', 'className="flex items-center gap-2 btn-primary-responsive bg-green-600 hover:bg-green-700"'),
    (r'className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700', 'className="flex items-center gap-2 btn-primary-responsive bg-green-600 hover:bg-green-700'),
    (r'className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700', 'className="btn-primary-responsive bg-green-600 hover:bg-green-700'),
    
    # 7. BUTTONS - Secondary
    (r'className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm sm:text-base"', 'className="flex items-center gap-2 btn-secondary-responsive"'),
    (r'className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300', 'className="btn-secondary-responsive'),
    (r'className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300', 'className="btn-secondary-responsive'),
    (r'className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200', 'className="btn-secondary-responsive'),
    (r'className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200', 'className="btn-secondary-responsive'),
    (r'className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50', 'className="btn-secondary-responsive'),
    (r'className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50', 'className="btn-secondary-responsive'),
    (r'className="px-3 sm:px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm sm:text-base"', 'className="btn-secondary-responsive"'),
    
    # 8. BUTTONS - Danger
    (r'className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700', 'className="btn-danger-responsive'),
    (r'className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700', 'className="btn-danger-responsive'),
    
    # 9. FORM LABELS
    (r'className="block text-sm font-medium text-gray-700 mb-2', 'className="form-label-responsive'),
    (r'className="block text-sm font-medium text-gray-700 mb-1', 'className="form-label-responsive'),
    (r'className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"', 'className="form-label-responsive"'),
    
    # 10. FORM INPUTS
    (r'className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500', 'className="form-input-responsive'),
    (r'className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500', 'className="form-input-responsive'),
    (r'className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500', 'className="form-input-responsive'),
    (r'className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500', 'className="form-input-responsive'),
    (r'className="w-full px-4 py-2 border border-gray-300 rounded-lg', 'className="form-input-responsive'),
    (r'className="w-full px-3 py-2 border border-gray-300 rounded-lg', 'className="form-input-responsive'),
    (r'className="w-full px-3 py-2 border rounded-lg text-sm sm:text-base"', 'className="form-select-responsive"'),
    
    # 11. TABLES - Wrapper
    (r'<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">\s*<div className="overflow-x-auto">\s*<table className="min-w-full divide-y divide-gray-200">', 
     '<div className="table-responsive-wrapper custom-scrollbar">\n        <table className="table-responsive">'),
    (r'<div className="overflow-x-auto rounded-lg border border-gray-200">\s*<table className="min-w-full divide-y divide-gray-200">', 
     '<div className="table-responsive-wrapper custom-scrollbar">\n        <table className="table-responsive">'),
    (r'<div className="overflow-x-auto">\s*<table className="min-w-full divide-y divide-gray-200">', 
     '<div className="table-responsive-wrapper custom-scrollbar">\n        <table className="table-responsive">'),
    
    # 12. TABLE HEADERS
    (r'className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', 'className="table-th-responsive'),
    (r'className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase', 'className="table-th-responsive'),
    (r'className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase', 'className="table-th-responsive'),
    (r'className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"', 'className="table-th-responsive whitespace-nowrap"'),
    
    # 13. TABLE CELLS
    (r'className="px-6 py-4 whitespace-nowrap', 'className="table-td-responsive whitespace-nowrap'),
    (r'className="px-6 py-4', 'className="table-td-responsive'),
    (r'className="px-4 py-3', 'className="table-td-responsive'),
    (r'className="px-3 sm:px-4 py-3', 'className="table-td-responsive'),
    (r'className="px-3 sm:px-4 py-2 sm:py-3"', 'className="table-td-responsive"'),
    
    # 14. MODALS - Backdrop
    (r'className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50', 'className="modal-backdrop'),
    (r'className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"', 'className="modal-backdrop"'),
    (r'className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50', 'className="modal-backdrop'),
    
    # 15. MODALS - Content
    (r'className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6', 'className="modal-content-responsive'),
    (r'className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6', 'className="modal-content-responsive'),
    (r'className="bg-white rounded-lg shadow-xl max-w-md w-full p-6', 'className="modal-content-responsive'),
    (r'className="bg-white rounded-lg p-6 max-w-2xl w-full', 'className="modal-content-responsive'),
    (r'className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-\[90vh\] overflow-y-auto"', 'className="modal-content-responsive"'),
    (r'className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-\[90vh\] overflow-y-auto"', 'className="modal-content-responsive"'),
    
    # 16. MODAL TITLES
    (r'className="text-xl font-bold text-gray-900 mb-4', 'className="modal-title-responsive mb-4'),
    (r'className="text-lg sm:text-xl font-bold mb-4"', 'className="modal-title-responsive mb-4"'),
    (r'className="text-xl font-bold mb-4', 'className="modal-title-responsive mb-4'),
    
    # 17. SPACING
    (r'className="mb-6', 'className="mb-responsive'),
    (r'className="mb-8', 'className="mb-responsive'),
    (r'className="gap-6', 'className="gap-responsive'),
    (r'className="mb-4 sm:mb-6"', 'className="mb-responsive"'),
    (r'className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6"', 'className="bg-blue-50 border border-blue-200 rounded-lg p-responsive mb-responsive"'),
]

def update_file(filepath):
    """Update a single file with all responsive class replacements"""
    try:
        # Read the file
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        replacements_made = 0
        
        # Apply all replacements
        for pattern, replacement in REPLACEMENTS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                replacements_made += 1
                content = new_content
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, replacements_made
        
        return False, 0
        
    except Exception as e:
        print(f"❌ Error updating {filepath}: {e}")
        return False, 0

def main():
    """Main execution"""
    print("🚀 Starting Automated Bulk Responsive Update")
    print("=" * 60)
    
    # Get project root (assuming script is in project root)
    project_root = Path(__file__).parent
    pages_dir = project_root / "src" / "pages"
    
    if not pages_dir.exists():
        print(f"❌ Error: {pages_dir} not found!")
        return
    
    # Get all .tsx files (desktop pages)
    desktop_files = list(pages_dir.glob("*.tsx"))
    
    # Get all mobile .tsx files
    mobile_dir = pages_dir / "mobile"
    mobile_files = list(mobile_dir.glob("*.tsx")) if mobile_dir.exists() else []
    
    all_files = desktop_files + mobile_files
    
    print(f"📁 Found {len(all_files)} pages to update:")
    print(f"   - {len(desktop_files)} desktop pages")
    print(f"   - {len(mobile_files)} mobile pages")
    print()
    
    # Update all files
    updated_count = 0
    total_replacements = 0
    
    for filepath in sorted(all_files):
        relative_path = filepath.relative_to(pages_dir.parent)
        was_updated, replacements = update_file(filepath)
        
        if was_updated:
            updated_count += 1
            total_replacements += replacements
            print(f"✅ {relative_path} ({replacements} updates)")
        else:
            print(f"⏭️  {relative_path} (no changes needed)")
    
    print()
    print("=" * 60)
    print(f"🎉 COMPLETE!")
    print(f"   Updated: {updated_count}/{len(all_files)} files")
    print(f"   Total replacements: {total_replacements}")
    print()
    print("📝 Next steps:")
    print("   1. Test locally: npm run dev")
    print("   2. Check a few pages in browser")
    print("   3. Commit: git add src/pages/")
    print("   4. Push: git push origin main")
    print()
    print("✨ Your app is now fully responsive!")

if __name__ == "__main__":
    main()
