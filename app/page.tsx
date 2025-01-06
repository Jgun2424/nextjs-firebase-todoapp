'use client';

import { useAuth } from "@/context/AuthContext";
import { Checkbox } from "@/components/ui/checkbox"
import { CustomScroll } from "react-custom-scroll";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import RenderTaskCard from "@/components/render-task-card";


export default function Home() {

  const { user, userData, getTasksData } = useAuth();
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user && !userData) {
      return;
    } else {
      const fetchTasks = async () => {
        const tasksData = await Promise.all(userData?.taskList?.map(async (task: any) => {
          return await getTasksData(task.id);
        }) || []);
        
        const allTasks = tasksData.flatMap(taskData => taskData.tasks);
        
        setTodayTasks(allTasks.filter((task: any) => {
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
          return !task.completed && task.completeByTimestamp >= todayStart.getTime() && task.completeByTimestamp <= todayEnd.getTime();
        }));

        setUpcomingTasks(allTasks.filter((task: any) => {
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return !task.completed && task.completeByTimestamp > todayStart.getTime();
        }));
        
      };

      fetchTasks();
    }
  }, [user, userData]);

  if (!user || !userData) {
    return;
  }


  return (
    <div className="flex flex-col flex-1 px-20 py-14 max-h-screen overflow-hidden">
      <div>
        <h1 className="text-4xl font-bold">Hello, {userData.displayName}</h1>
        <p className="text-base text-gray-500 tracking-tight font-semibold">{new Date().toLocaleDateString('en-US', {weekday: 'long',year: 'numeric', month: 'long', day: 'numeric'})}</p>
        

        <div className="flex gap-4 mt-6 mb-2">
        <h1 className='text-2xl font-bold tracking-tight'>Task dashboard</h1>
        </div>
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <CustomScroll className="flex flex-col gap-4" heightRelativeToParent="80%">
              {todayTasks.map((task: any) => (
                <RenderTaskCard task={task} task_id={task.id} parent_id={task.parentTaskId} />
              ))}
              {todayTasks.length === 0 && <p className='text-base text-gray-500 tracking-tight font-semibold'>Theres no tasks here!</p>}
            </CustomScroll>
          </TabsContent>


          <TabsContent value="upcoming">
            <CustomScroll className="flex flex-col gap-4" heightRelativeToParent="80%">
              {upcomingTasks.map((task: any) => (
                <RenderTaskCard task={task} task_id={task.id} parent_id={task.parentTaskId} />
              ))}
            </CustomScroll>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
