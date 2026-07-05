# Android: capture classroom code at signup

This admin panel generates a join code per classroom (Classrooms → card shows
the code, plus a `/join/<code>` link). A classroom's code **is** its database
key (`classrooms/{CODE}` — no separate id), so resolving a code is a direct
key lookup, not a query. For a student's account to actually land in that
classroom, `NameSave.kt`'s signup flow needs to:

1. Accept an (optional) classroom code field.
2. After creating the Firebase Auth user, check that `classrooms/{CODE}`
   exists (`CODE` uppercased).
3. Write that code into the `users/{uid}` record as `classCode`, alongside
   the existing fields.

This only touches the Android project — nothing here runs in the Next.js app.

## 1. Layout

Add a text field to `activity_name_save.xml`, e.g. right after the email
field, mirroring the existing `TextInputLayout` pattern:

```xml
<com.google.android.material.textfield.TextInputLayout
    android:id="@+id/tilClassroomCode"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:hint="Classroom code (optional)">

    <com.google.android.material.textfield.TextInputEditText
        android:id="@+id/etClassroomCode"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:inputType="textCapCharacters" />

</com.google.android.material.textfield.TextInputLayout>
```

Keep it optional — students who install without a code from their instructor
can still sign up and be assigned to a classroom later from the admin panel.

## 2. `NameSave.kt` changes

Add an alpha animation line next to the others in `setupAnimations()` (optional,
for consistency):

```kotlin
binding.tilClassroomCode.alpha = 0f
binding.tilClassroomCode.animate().alpha(1f).setStartDelay(550).setDuration(500).start()
```

Replace `handleSignup()`'s account-creation block with a version that checks
the classroom code exists before writing the user record:

```kotlin
private fun handleSignup() {

    val fullName = binding.etFullName.text.toString().trim()
    val username = binding.etUsername.text.toString().trim()
    val email = binding.etEmail.text.toString().trim()
    val password = binding.etPassword.text.toString().trim()
    val confirmPassword = binding.etConfirmPassword.text.toString().trim()
    val classroomCode = binding.etClassroomCode.text.toString().trim().uppercase()

    // ... keep all existing validation as-is ...

    binding.btnSignup.isEnabled = false
    binding.btnSignup.text = "CREATING..."

    auth.createUserWithEmailAndPassword(email, password)
        .addOnCompleteListener { task ->

            if (!task.isSuccessful) {
                Toast.makeText(
                    this,
                    task.exception?.message ?: "Signup Failed",
                    Toast.LENGTH_LONG
                ).show()
                binding.btnSignup.isEnabled = true
                binding.btnSignup.text = "CREATE ACCOUNT"
                return@addOnCompleteListener
            }

            val uid = auth.currentUser?.uid ?: ""

            if (classroomCode.isEmpty()) {
                saveUser(uid, fullName, username, email, classCode = null)
                return@addOnCompleteListener
            }

            // A classroom's code is its database key, so this is a direct
            // existence check, not a query.
            database.reference
                .child("classrooms")
                .child(classroomCode)
                .addListenerForSingleValueEvent(object : com.google.firebase.database.ValueEventListener {
                    override fun onDataChange(snapshot: com.google.firebase.database.DataSnapshot) {
                        val classCode = if (snapshot.exists()) classroomCode else null
                        if (classCode == null) {
                            Toast.makeText(
                                this@NameSave,
                                "Classroom code not found — you can join one later.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                        saveUser(uid, fullName, username, email, classCode)
                    }

                    override fun onCancelled(error: com.google.firebase.database.DatabaseError) {
                        // Network/permission issue looking up the code — don't block signup.
                        saveUser(uid, fullName, username, email, classCode = null)
                    }
                })
        }
}

private fun saveUser(
    uid: String,
    fullName: String,
    username: String,
    email: String,
    classCode: String?
) {
    val userMap = hashMapOf(
        "uid" to uid,
        "fullName" to fullName,
        "username" to username,
        "email" to email,
        "classCode" to classCode,
        "learningProgress" to buildInitialProgress()
    )

    database.reference
        .child("users")
        .child(uid)
        .setValue(userMap)
        .addOnSuccessListener {
            saveName(this, fullName)
            Toast.makeText(this, "Account Created Successfully", Toast.LENGTH_SHORT).show()
            navigateToIntroduction()
        }
        .addOnFailureListener {
            Toast.makeText(this, "Failed to save user data", Toast.LENGTH_SHORT).show()
            binding.btnSignup.isEnabled = true
            binding.btnSignup.text = "CREATE ACCOUNT"
        }
}
```

## 3. Realtime Database rules

The lookup (`classrooms/{CODE}`) runs **after** the user is authenticated
(`auth.createUserWithEmailAndPassword` already succeeded), so the existing
`auth != null` read rule covers it — no rule changes needed on the Android
side. Just make sure `users` has the `classCode` index, matching what's in
this repo's `README.md`:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": { ".indexOn": ["classCode"] },
    "downloadInvites": { ".indexOn": ["classroomId"] }
  }
}
```

## Notes / known gap

- Students created **from the admin panel** start with `lesson.total: 0` for
  every lesson, since the admin doesn't have access to the bundled
  `lessonN.json` asset files Android uses to compute `total` via
  `getLessonContentCount()`. Their progress bars will read `0/0` until they
  open each lesson in the app — if the Android lesson screen doesn't already
  self-heal a `0` total by recomputing it from the asset on open, that's worth
  adding so admin-created accounts behave identically to app-signup accounts.
