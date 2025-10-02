// components/FollowTrendChart.tsx
import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  Bar,
  Line,
  CartesianGrid,
} from "recharts";

type Point = { date: string; newFollowers: number; cumulative: number };

export default function FollowTrendChart({
  userId,
  username,
  days = 30,
}: {
  userId?: string;
  username?: string;
  days?: number;
}) {
  const [data, setData] = useState<Point[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const qs = userId ? `userId=${encodeURIComponent(userId)}` : `username=${encodeURIComponent(username ?? "")}`;
        const res = await fetch(`/api/user/followers/trends?${qs}&days=${days}`);
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!mounted) return;
        setData(json.days || []);
      } catch (_err) {
        // usamos _err porque el catch declara _err
        console.error("Error loading follow trends:", _err);
        setData([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [userId, username, days]);

  if (loading) return <div className="p-4 text-sm text-gray-500">Cargando tendencia...</div>;
  if (!data || data.length === 0) return <div className="p-4 text-sm text-gray-500">Sin datos suficientes.</div>;

  return (
    <div className="w-full h-64 bg-transparent rounded-lg p-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={10} />
          <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend verticalAlign="top" />
          {/* new followers (bar) */}
          <Bar dataKey="newFollowers" name="Nuevos seguidores (día)" barSize={12} fill="#8b5cf6" />
          {/* cumulative line */}
          <Line type="monotone" dataKey="cumulative" name="Seguidores (acumulado)" stroke="#ef476f" strokeWidth={2} dot={false} />
          {/* area for subtle trend */}
          <Area type="monotone" dataKey="cumulative" fill="rgba(239,71,111,0.12)" stroke="none" yAxisId="right" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
