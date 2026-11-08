import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useApp } from "../app/_layout";
import { ACTIVITY_LABELS } from "../../shared/diary-settings.mjs";
export default function ActivityInbox() {
  const { user, supabase, accent } = useApp(),
    router = useRouter();
  const [rows, setRows] = useState<any[]>([]),
    [filter, setFilter] = useState("all"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [more, setMore] = useState(true);
  const load = useCallback(
    async (append = false) => {
      setLoading(true);
      setError("");
      let q = supabase
        .from("diary_activity")
        .select("id,actor_id,post_id,kind,created_at,read_at")
        .eq("recipient_id", user?.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      if (filter === "like") q = q.in("kind", ["like", "comment_like"]);
      else if (filter === "comment") q = q.in("kind", ["comment", "reply"]);
      else if (filter !== "all") q = q.eq("kind", filter);
      const offset = append ? rows.length : 0;
      const r = await q.range(offset, offset + 29);
      if (r.error) {
        setError("Activity could not load. Please retry.");
        setLoading(false);
        return;
      }
      const actors = [
        ...new Set((r.data || []).map((x: any) => x.actor_id).filter(Boolean)),
      ];
      let names: any = {};
      if (actors.length) {
        const p = await supabase
          .from("profiles")
          .select("id,full_name")
          .in("id", actors);
        names = Object.fromEntries(
          (p.data || []).map((x: any) => [x.id, x.full_name]),
        );
      }
      const items = (r.data || []).map((x: any) => ({
        ...x,
        name:
          x.kind === "bookmark"
            ? "Someone"
            : x.actor_id
              ? names[x.actor_id] || "A community member"
              : "An anonymous member",
      }));
      setRows((prev) => (append ? [...prev, ...items] : items));
      setMore(items.length === 30);
      setLoading(false);
    },
    [filter, rows.length, supabase, user?.id],
  );
  useFocusEffect(
    useCallback(() => {
      void load(false);
      const timer=setInterval(()=>load(false),30000);
      return ()=>clearInterval(timer);
    }, [filter, user?.id]),
  );
  const mark = async (id?: string) => {
    let q = supabase
      .from("diary_activity")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user?.id);
    if (id) q = q.eq("id", id);
    else q = q.is("read_at", null);
    const r = await q;
    if (r.error) {
      setError("Could not mark activity as read.");
      return false;
    }
    setRows((prev) =>
      prev.map((x) =>
        !id || x.id === id ? { ...x, read_at: new Date().toISOString() } : x,
      ),
    );
    return true;
  };
  return (
    <View style={{ flex: 1, padding: 18, gap: 16 }}>
      <Text style={{ fontSize: 25, fontWeight: "700" }}>
        Activity & Notifications
      </Text>
      <Text>
        Likes, comments, shares and posts from authors you follow. Bookmark
        identities stay private.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {["all", "like", "comment", "bookmark", "share", "post"].map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            accessibilityState={{ selected: filter === f }}
          >
            <Text
              style={{
                color: filter === f ? accent : "#475569",
                fontWeight: filter === f ? "700" : "400",
              }}
            >
              {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1) + "s"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={() => mark()}>
        <Text style={{ color: accent }}>Mark all as read</Text>
      </TouchableOpacity>
      {!!error && (
        <TouchableOpacity onPress={() => load(false)}>
          <Text accessibilityLiveRegion="polite">{error} Tap to retry.</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={rows}
        keyExtractor={(x) => x.id}
        refreshing={loading}
        onRefresh={() => load(false)}
        ListEmptyComponent={
          !loading ? (
            <Text>No activity yet. New interactions will appear here.</Text>
          ) : (
            <ActivityIndicator />
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              paddingVertical: 18,
              borderBottomWidth: 1,
              borderColor: "#e2e8f0",
            }}
            onPress={async () => {
              if (await mark(item.id))
                router.push(`/post/${item.post_id}` as any);
            }}
          >
            <Text
              style={{ fontSize: 16, fontWeight: item.read_at ? "400" : "700" }}
            >
              {item.name}{" "}
              {ACTIVITY_LABELS[item.kind as keyof typeof ACTIVITY_LABELS]}.
            </Text>
            <Text style={{ color: "#64748b", marginTop: 7 }}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          more && rows.length ? (
            <TouchableOpacity
              disabled={loading}
              onPress={() => load(true)}
              style={{ padding: 20 }}
            >
              <Text style={{ color: accent }}>Load more</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
}
