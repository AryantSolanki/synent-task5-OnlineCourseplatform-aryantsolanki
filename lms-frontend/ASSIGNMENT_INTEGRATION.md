# Assignment Feature — Integration Guide

## What's included

### Frontend (already patched in this zip)
- `src/api/assignmentApi.js`               — all API calls
- `src/components/instructor/AssignmentManager.jsx` — instructor CRUD panel (Step 6 of CourseWizard)
- `src/components/course/StudentAssignmentPanel.jsx` — student submit + instant result (Assignments tab in CoursePlayer)
- `src/pages/instructor/CourseWizard.jsx`  — patched: added Step 6 "Assignments"
- `src/pages/student/CoursePlayer.jsx`     — patched: added "Assignments" tab

### Backend (copy from BACKEND_NEW_FILES/ into your project)
- `assignmentController.js`  → `controllers/`
- `assignmentRoutes.js`       → `routes/`
- `instructorRoutes.js`       → `routes/` (replace existing)
- `courseRoutes.js`           → `routes/` (replace existing)

---

## Backend wiring — 3 steps

### Step 1 — Copy the files
```
cp BACKEND_NEW_FILES/assignmentController.js  your-backend/controllers/
cp BACKEND_NEW_FILES/assignmentRoutes.js       your-backend/routes/
cp BACKEND_NEW_FILES/instructorRoutes.js       your-backend/routes/   # replaces existing
cp BACKEND_NEW_FILES/courseRoutes.js           your-backend/routes/   # replaces existing
```

### Step 2 — Register the new route in server.js / app.js
Add this ONE line alongside your existing route registrations:

```js
app.use('/api/assignments', require('./routes/assignmentRoutes'));
```

Your existing routes stay the same:
```js
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/courses',     require('./routes/courseRoutes'));       // updated
app.use('/api/enrollments', require('./routes/enrollmentRoutes'));
app.use('/api/student',     require('./routes/studentRoutes'));
app.use('/api/instructor',  require('./routes/instructorRoutes'));   // updated
app.use('/api/admin',       require('./routes/adminRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));   // NEW
```

### Step 3 — Verify Assignment model has expectedAnswer field
Open `models/Assignment.js` and add if missing:
```js
expectedAnswer: { type: String, default: '' },
```

---

## How it works end-to-end

### Instructor flow
1. Go to **Instructor Panel → My Courses → Edit** any course
2. Navigate to **Step 6: Assignments**
3. Click **Add Assignment**
4. Fill title, description, submission type
5. Optionally set **Expected Answer** → enables auto-grading
6. Toggle **Publish immediately** → students see it right away

### Student flow
1. Open any enrolled course → **Course Player**
2. Click the **Assignments** tab (next to Overview and Notes)
3. Expand any assignment card
4. Submit text answer, URL, or file
5. If instructor set an expected answer → **instant result appears** (score, pass/fail, feedback)
6. If no expected answer → status shows "Awaiting grade" until instructor grades manually

### Auto-grading logic (assignmentController.js)
- Compares student's text answer to `expectedAnswer` (case-insensitive)
- Exact match OR contains match → full marks
- Partial match fails → 40% score with feedback showing correct answer
- Instructors can still override by manually grading via Grading page

---

## API endpoints added

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/api/instructor/courses/:courseId/assignments` | Instructor | List assignments with submission counts |
| POST   | `/api/instructor/courses/:courseId/assignments` | Instructor | Create assignment |
| PUT    | `/api/instructor/assignments/:id`              | Instructor | Update assignment |
| DELETE | `/api/instructor/assignments/:id`              | Instructor | Delete + all submissions |
| GET    | `/api/courses/:courseId/assignments`            | Student (enrolled) | List published assignments + own submission |
| POST   | `/api/assignments/:assignmentId/submit`         | Student (enrolled) | Submit + auto-grade if expected answer set |
| GET    | `/api/assignments/:assignmentId/my-submission`  | Student | Get own submission/result |
