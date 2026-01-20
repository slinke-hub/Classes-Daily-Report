import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyDk3mnCJcQoP3wCZ5ubi6Owvw6bZoSZ2_I",
    authDomain: "gpa-class-reports.firebaseapp.com",
    projectId: "gpa-class-reports",
    storageBucket: "gpa-class-reports.appspot.com",
    messagingSenderId: "932091328883",
    appId: "y1:932091328883:web:d9fcf107d70638cc73ad06"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
