export {}

declare global {
  interface Window {
    __FB?: {
      app: any
      auth: any
      db: any
      signInWithEmailAndPassword: any
      createUserWithEmailAndPassword: any
      signOut: any
      onAuthStateChanged: any
      collection: any
      doc: any
      getDoc: any
      getDocs: any
      addDoc: any
      setDoc: any
      updateDoc: any
      onSnapshot: any
      query: any
      where: any
      orderBy: any
      limit: any
      writeBatch: any
      serverTimestamp: any
      Timestamp: any
      collectionGroup: any
      profile?: any
      householdId?: string | null
      household?: any
    }
  }
}
