"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseAuth } from "@/lib/firebase-auth"
import { db } from "@/lib/firebase"

export default function TestSigninPage() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    if (!token) {
      router.replace("/login")
      return
    }

    async function run(token: string) {
      try {
        // Decode the mock token to get test user info
        const decoded = JSON.parse(atob(token))
        const { uid: testId, role, createProfile } = decoded
        
        // Use a deterministic email/password based on testId for the Auth Emulator
        const email = `${testId}@test.local`
        const password = `test-password-${testId}`
        
        const auth = getFirebaseAuth()
        let firebaseUid: string
        
        // Try to sign in first, if user doesn't exist, create them
        try {
          const cred = await signInWithEmailAndPassword(auth, email, password)
          firebaseUid = cred.user.uid
        } catch (signInError: any) {
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
            // Create the user in Auth Emulator
            const cred = await createUserWithEmailAndPassword(auth, email, password)
            firebaseUid = cred.user.uid
          } else {
            throw signInError
          }
        }
        
        // Create the Firestore profile using the actual Firebase uid
        if (createProfile && role) {
          await setDoc(
            doc(db, "users", firebaseUid),
            {
              uid: firebaseUid,
              email,
              displayName: testId,
              role,
              department: "Test Dept",
              courses: ["TST101"],
              profileComplete: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          )
        }
        
        // Navigate directly to the appropriate dashboard based on role
        // This avoids race conditions with AuthRedirector
        const targetPath = role === 'teacher' ? '/teacher' : '/student'
        router.replace(targetPath)
      } catch (e) {
        console.error("test sign-in failed", e)
        router.replace("/login")
      }
    }
    run(token)
  }, [router])

  return <div className="p-6">Signing in test user…</div>
}
