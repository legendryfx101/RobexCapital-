import React, { useState, useEffect } from 'react';
import { Users, Activity, BarChart3, Loader2 } from 'lucide-react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

interface AdminMetrics {
  totalUsers: number;
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  yearlyActive: number;
}

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      try {
        if (!auth.currentUser) {
            setError('Please log in.');
            return;
        }
        
        // Admin check
        const adminDoc = await getDoc(doc(db, 'admins', auth.currentUser.uid));
        if (!adminDoc.exists()) {
            // Temporary auto-grant for the admin
            if (auth.currentUser.email === 'legendryfx101@gmail.com') {
                await setDoc(doc(db, 'admins', auth.currentUser.uid), { grantedAt: new Date().toISOString() });
                console.log('Admin access granted.');
            } else {
                setError('You do not have administrative access.');
                return;
            }
        }

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = usersSnapshot.docs.map(doc => doc.data());
        
        const now = new Date();
        const daily = now.getTime() - 24 * 60 * 60 * 1000;
        const weekly = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        const monthly = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        const yearly = now.getTime() - 365 * 24 * 60 * 60 * 1000;

        let dailyActive = 0, weeklyActive = 0, monthlyActive = 0, yearlyActive = 0;

        users.forEach(user => {
          const lastActive = new Date(user.lastActive || 0).getTime();
          if (lastActive > daily) dailyActive++;
          if (lastActive > weekly) weeklyActive++;
          if (lastActive > monthly) monthlyActive++;
          if (lastActive > yearly) yearlyActive++;
        });

        setMetrics({
          totalUsers: users.length,
          dailyActive,
          weeklyActive,
          monthlyActive,
          yearlyActive,
        });
      } catch (err) {
        console.error('Error fetching admin metrics:', err);
        setError('Error fetching admin metrics.');
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, []);

  if (loading) return <div className="p-8 text-center text-white"><Loader2 className="animate-spin w-8 h-8 mx-auto" /></div>;
  if (error) return <div className="p-6 text-center text-red-500 bg-zinc-900 rounded-2xl border border-gray-800">{error}</div>;

  return (
    <div className="p-6 bg-zinc-900 rounded-2xl border border-gray-800 space-y-6">
      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
        <BarChart3 className="text-amber-500" /> Admin Dashboard
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { title: 'Total Registered', value: metrics?.totalUsers, icon: Users },
          { title: 'Daily Active', value: metrics?.dailyActive, icon: Activity },
          { title: 'Weekly Active', value: metrics?.weeklyActive, icon: Activity },
          { title: 'Monthly Active', value: metrics?.monthlyActive, icon: Activity },
          { title: 'Yearly Active', value: metrics?.yearlyActive, icon: Activity },
        ].map((m, i) => (
          <div key={i} className="p-4 bg-zinc-950 border border-gray-800 rounded-xl">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <m.icon className="w-4 h-4" /> {m.title}
            </div>
            <div className="text-3xl font-bold text-white">{m.value || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
