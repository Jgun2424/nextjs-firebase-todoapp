'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/firebase';
import { arrayUnion, doc, setDoc, getDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: any;
    login: (userData: any) => void;
    logout: () => void;
    createUser: (user: any) => void;
    createNewList: (listData: any) => void;
    getTasksData: (task_id: string) => void;
    subscribeToTasks: (task_id: string, callback: (data: any) => void) => void;
    markTaskAsComplete: (task_id: string, task_id_to_update: string) => void;
    createNewTask: (taskData: any, task_id: string) => void;
    deleteList: (task_id: string) => void;
    userData: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [Loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    useEffect(() => {
        if (Loading) {

        }
    }, [Loading]);

    const createUser = async (userData: any) => {
        await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        
        if (auth.currentUser) {
            const user_doc = doc(db, 'users', auth.currentUser.uid);
            const user = await getDoc(user_doc);

            if (!user.exists()) {
                await setDoc(user_doc, {
                    uid: auth.currentUser.uid,
                    email: userData.email,
                    displayName: userData.displayName,
                });

                await createNewList({ title: 'My First List', emoji: '📝' });
                
            }
        } else {
            throw new Error('No authenticated user found');
        }
    }

    const createNewList = async (listData: any) => {
        if (auth.currentUser) {
            const user_doc = doc(db, 'users', auth.currentUser.uid);
            const user = await getDoc(user_doc);
            const TASK_ID = uuidv4();
            const task_doc = doc(db, 'tasks', TASK_ID);

            if (user.exists()) {
                await updateDoc(user_doc, {
                    taskList: arrayUnion({ 
                        id: TASK_ID, 
                        title: listData.title, 
                        emoji: listData.emoji, 
                        task_count: 0 
                    }),
                });

                await setDoc(task_doc, {
                    id: TASK_ID,
                    title: listData.title,
                    emoji: listData.emoji,
                    task_count: 0,
                    tasks: [],
                });

                router.push(`/task/${TASK_ID}`);
            }
        } else {
            throw new Error('No authenticated user found');
        }
    }

    const getTasksData = async (task_id: any) => {
        const task_doc = doc(db, 'tasks', task_id);
        const task = await getDoc(task_doc);

        if (task.exists()) {
            return task.data();
        } else {
            return;
        }
    }


    const subscribeToTasks = (task_id: string, callback: (data: any) => void) => {
        const task_doc = doc(db, 'tasks', task_id);
        return onSnapshot(task_doc, (doc) => {
            if (doc.exists()) {
                callback(doc.data());
            } else {
                console.error('No task found');
            }
        });
    };

    const createNewTask = async (taskData: any, task_id: string) => {
        if (!auth.currentUser) {
            throw new Error('No authenticated user found');
        }
        console.log(taskData, task_id);
        const task_doc = doc(db, 'tasks', task_id);
        const task = await getDoc(task_doc);
        const user_doc = doc(db, 'users', auth.currentUser.uid);
        const user = await getDoc(user_doc);

        if (task.exists()) {
            await updateDoc(task_doc, {
                tasks: arrayUnion({ 
                    id: uuidv4(), 
                    title: taskData.title, 
                    completed: false,
                    completeByTimestamp: taskData.completeByTimestamp,
                    emoji: taskData.emoji,
                    parentTaskId: task_id,
                }),
            });

            await updateDoc(user_doc, {
                taskList: user.data()?.taskList?.map((task: any) => {
                    if (task.id === task_id) {
                        return { ...task, task_count: task.task_count + 1 };
                    } else {
                        return task;
                    }
                }),
            });

        } else {
            throw new Error('No task found');
        }
    }

    const markTaskAsComplete = async (task_id: string, task_id_to_update: string) => {
        if (!auth.currentUser) {
            throw new Error('No authenticated user found');
        }

        const task_doc = doc(db, 'tasks', task_id);
        const user_doc = doc(db, 'users', auth.currentUser.uid);
        const user = await getDoc(user_doc);
        const task = await getDoc(task_doc);

        if (task.exists()) {
            const taskData = task.data();
            const updatedTasks = taskData.tasks.map((t: any) => {
                if (t.id === task_id_to_update) {
                    return { 
                        ...t, 
                        completed: !t.completed,
                        completedAt: !t.completed ? Date.now() : null,
                    };
                } else {
                    return t;
                }
            });

            await updateDoc(task_doc, { tasks: updatedTasks });

            const updatedTaskList = user.data()?.taskList?.map((t: any) => {
                if (t.id === task_id) {
                    const completedTasks = updatedTasks.filter((task: any) => task.completed).length;
                    const outstandingTasks = updatedTasks.length - completedTasks;
                    return { 
                        ...t, 
                        task_count: outstandingTasks,
                        completed_count: completedTasks,
                    };
                } else {
                    return t;
                }
            });

            await updateDoc(user_doc, { taskList: updatedTaskList });
        } else {
            throw new Error('No task found');
        }
    }

    const deleteList = async (task_id: string) => {
        if (!auth.currentUser) {
            throw new Error('No authenticated user found');
        }

        const task_doc = doc(db, 'tasks', task_id);
        const user_doc = doc(db, 'users', auth.currentUser.uid);
        const user = await getDoc(user_doc);
        const task = await getDoc(task_doc);

        if (task.exists()) {
            await updateDoc(user_doc, {
                taskList: user.data()?.taskList?.filter((t: any) => t.id !== task_id),
            });

            await deleteDoc(task_doc);
        } else {
            throw new Error('No task found');
        }
    }

    const calculateTasksToBeCompletedToday = (user: any) => {
        if (user) {
            const taskList = user.data()?.taskList;
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

            taskList?.forEach(async (task: any) => {
                const taskData = await getTasksData(task.id);
                if (!taskData) return;
                const tasks = taskData.tasks;
                const tasksToBeCompletedToday = tasks.filter((task: any) => task.completeByTimestamp >= todayStart.getTime() && task.completeByTimestamp <= todayEnd.getTime());
                const tasksToBeCompletedTodayCount = tasksToBeCompletedToday.length;

                const user_doc = doc(db, 'users', user.uid);
                await updateDoc(user_doc, {
                    taskList: user.data()?.taskList?.map((t: any) => {
                        if (t.id === task.id) {
                            return { ...t, tasksToBeCompletedToday: tasksToBeCompletedTodayCount };
                        } else {
                            return t;
                        }
                    }),
                });
            });
    }
}


    const login = (userData: any) => {
        setUser(userData);
    };

    const logout = () => {
        setUser(null);
    };

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            setUser(user);
            setLoading(true);
    
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
    
                try {
                    const userDoc = await getDoc(userDocRef);
                    setUserData(userDoc.data());
                    calculateTasksToBeCompletedToday(user);
                } catch (error) {
                    console.error("Error fetching user data: ", error);
                } finally {
                    setLoading(false);
                }
    
                const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
                    setUserData(doc.data());
                });
    
                return () => unsubscribeSnapshot();
            } else {
                setUserData(null);
                setLoading(false);
            }
        });
    
        return () => unsubscribeAuth();
    }, []);

    const exports = { user, login, logout, userData, createUser, createNewList, getTasksData, subscribeToTasks, createNewTask, markTaskAsComplete, deleteList };

    return (
        <AuthContext.Provider value={exports}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};