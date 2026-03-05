# PDF Viewer Fix - Quick Reference Guide

## ✅ What Was Fixed

### 1. **SubjectDetail.jsx** - Lecture Tab PDF Viewer
- ✅ Added `onHttpError` handler to catch HTTP errors (404, 403, 500, etc.)
- ✅ Added `dpi=72` parameter to Google Docs viewer URL
- ✅ Allowlisted Supabase, GoogleUserContent, and GStatic domains
- ✅ Enhanced error logging with URLs and timestamps

### 2. **ActivityDetail.jsx** - Activity Tab PDF Viewer
- ✅ Added `onHttpError` handler to full-screen file modal
- ✅ Added `dpi=72` parameter for consistency
- ✅ Allowlisted Supabase and Google domains
- ✅ Enhanced logging in full-screen viewer

---

## 🧪 Testing Steps

### Test 1: Upload and View a Lecture PDF
```
1. Go to a subject as a teacher
2. Create a new Lecture with a PDF file
3. Switch to Lecture tab
4. Click the lecture thumbnail
5. Verify PDF displays in modal
6. Check React Native console for: "PDF loading started for: [URL]"
```

### Test 2: Upload and View an Activity PDF
```
1. Go to a subject as a teacher
2. Create a new Activity (Quiz/Assignment) with a PDF file
3. Click the activity card
4. Look for "Attached File" section with download button
5. Tap the button to open PDF in full-screen
6. Verify PDF displays correctly
```

### Test 3: Error Handling
```
1. If PDF fails to load, you should see an Alert dialog with:
   - "Access Error" or "Error Loading PDF"
   - HTTP status code if available
   - User-friendly explanation
2. Check console logs with error details
```

---

## 🔍 Verify the Fixes

### Check SubjectDetail.jsx Changes
```
Line ~2097: Should have "dpi=72" in URL
Line ~2103-2107: Should have onLoadStart with logging
Line ~2108-2125: Should have onError with full error details
Line ~2126-2140: Should have NEW onHttpError handler
Line ~2149-2166: Should have expanded onShouldStartLoadWithRequest
```

### Check ActivityDetail.jsx Changes
```
Line ~2206: Should have "dpi=72" in URL
Line ~2209-2213: Should have onLoadStart with logging
Line ~2214-2230: Should have onError with details
Line ~2231-2245: Should have NEW onHttpError handler
Line ~2254-2268: Should have expanded onShouldStartLoadWithRequest
```

---

## 🐛 If PDFs Still Don't Display

### Step 1: Check Console Logs
```
Open React Native Debugger and look for:
✓ "PDF loading started for: [URL]"
✓ "PDF loading completed"
✗ "PDF Loading Error:" = Problem with the PDF
✗ "PDF HTTP Error: 403" = Permission issue
✗ "PDF HTTP Error: 404" = File not found
✗ "Blocking external navigation" = CORS/domain issue
```

### Step 2: Verify Supabase Configuration
```
1. Open Supabase Dashboard
2. Go to Storage → [Your Bucket Name]
3. Check if bucket is "Public" (not Private)
4. Try opening a file URL directly in browser to verify access
   https://[your-project].supabase.co/storage/v1/object/public/[bucket]/[file-path]
```

### Step 3: Test with a Simple PDF
```
1. Upload a small, simple PDF (e.g., Text only)
2. Try opening it to see if the issue is PDF-specific
3. Very large or complex PDFs might have issues
```

---

## 📋 File Changes Summary

| File | Lines | Changes |
|------|-------|---------|
| SubjectDetail.jsx | 2094-2160 | Added error handlers, domain allowlist, dpi param, logging |
| ActivityDetail.jsx | 2200-2270 | Added error handlers, domain allowlist, dpi param, logging |

---

## 🚀 Expected Results

### Before Fix:
- ❌ Click to view PDF → Blank modal
- ❌ No error message
- ❌ No console logs
- ❌ User confused

### After Fix:
- ✅ Click to view PDF → Loading spinner
- ✅ PDF displays correctly
- ✅ Console shows: "PDF loading started..." and "PDF loading completed"
- ✅ If error: Alert with status code and explanation
- ✅ Better debugging information

---

## 💡 Next Steps

1. **Test the fixes** using the steps above
2. **Check console logs** to verify changes are working
3. **Report any issues** with specific error codes from console
4. **Verify Supabase** configuration if "Access Error" appears
5. **Check file sizes** if very large PDFs don't display

---

## 📞 Support

If PDFs still don't work after these fixes:
1. Share the **console error message** and **HTTP status code**
2. Provide the **file size** of the PDF that won't load
3. Describe **when the error happens** (during upload? during view?)
4. Note if **other file types** (images, docs) work correctly

---

## ✨ Summary

Your PDF viewer was failing silently because:
- No HTTP error detection
- Supabase URLs being blocked by request filter
- Missing diagnostic logging

These fixes add proper error handling, expanded domain allowlist, and comprehensive logging so you can now see exactly what's happening when PDFs load or fail to load.
