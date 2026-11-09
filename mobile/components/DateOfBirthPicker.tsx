import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ageAt } from "../../shared/launch-safety.mjs";
const ROW = 44,
  MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
function Wheel({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<FlatList>(null),
    index = Math.max(
      0,
      items.findIndex((i) => i.value === value),
    );
  const choose = (i: number) => {
    const target = Math.max(0, Math.min(items.length - 1, i));
    onChange(items[target].value);
    ref.current?.scrollToOffset({ offset: target * ROW, animated: true });
  };
  return (
    <View style={{ flex: label === "Month" ? 1.6 : 1 }}>
      <Text style={s.columnTitle}>{label}</Text>
      <View style={{ height: ROW * 5 }}>
        <View pointerEvents="none" style={s.selection} />
        <FlatList
          ref={ref}
          data={items}
          keyExtractor={(i) => String(i.value)}
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: ROW, offset: i * ROW, index: i })}
          contentContainerStyle={{ paddingVertical: ROW * 2 }}
          snapToInterval={ROW}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            onChange(
              items[
                Math.max(
                  0,
                  Math.min(
                    items.length - 1,
                    Math.round(e.nativeEvent.contentOffset.y / ROW),
                  ),
                )
              ].value,
            )
          }
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{
            min: 0,
            max: items.length - 1,
            now: index,
            text: items[index].label,
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) =>
            choose(index + (e.nativeEvent.actionName === "increment" ? 1 : -1))
          }
          renderItem={({ item, index: i }) => (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`${label} ${item.label}`}
              accessibilityState={{ selected: item.value === value }}
              onPress={() => choose(i)}
              style={s.wheelRow}
            >
              <Text
                style={[s.wheelText, item.value === value && s.selectedText]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}
export default function DateOfBirthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [year, setYear] = useState(2000),
    [month, setMonth] = useState(1),
    [day, setDay] = useState(1),
    [error, setError] = useState("");
  const current = new Date().getUTCFullYear();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate(),
    safeDay = Math.min(day, days);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  function show() {
    const d = value
      ? new Date(value + "T00:00:00Z")
      : new Date(Date.UTC(current - 18, 0, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
    setDay(d.getUTCDate());
    setError("");
    setOpen(true);
  }
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Choose birth date"
        style={s.field}
        onPress={show}
      >
        <Text style={value ? s.value : s.placeholder}>
          {value
            ? new Date(value + "T00:00:00Z").toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })
            : "Select your birth date"}
        </Text>
        <Text style={s.chevron}>⌄</Text>
      </TouchableOpacity>
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={s.screen}>
          <View style={s.header}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setOpen(false)}
              style={s.touch}
            >
              <Text style={s.link}>Cancel</Text>
            </TouchableOpacity>
            <Text accessibilityRole="header" style={s.heading}>
              Your birth date
            </Text>
            <View style={{ width: 50 }} />
          </View>
          <View style={s.body}>
            <Text style={s.description}>
              Scroll the day, month and year, or tap an option. Accounts are
              available from age 13.
            </Text>
            {open && (
              <View style={s.wheels}>
                <Wheel
                  label="Day"
                  value={safeDay}
                  items={Array.from({ length: days }, (_, i) => ({
                    value: i + 1,
                    label: String(i + 1),
                  }))}
                  onChange={setDay}
                />
                <Wheel
                  label="Month"
                  value={month}
                  items={MONTHS.map((label, i) => ({ label, value: i + 1 }))}
                  onChange={setMonth}
                />
                <Wheel
                  label="Year"
                  value={year}
                  items={Array.from({ length: 121 }, (_, i) => ({
                    value: current - i,
                    label: String(current - i),
                  }))}
                  onChange={setYear}
                />
              </View>
            )}
            <Text style={s.preview}>
              {new Date(iso + "T00:00:00Z").toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </Text>
            {!!error && (
              <Text accessibilityRole="alert" style={s.error}>
                {error}
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              style={s.primary}
              onPress={() => {
                if ((ageAt(iso) ?? 0) < 13) {
                  setError("Bible Diaries accounts are available from age 13.");
                  return;
                }
                onChange(iso);
                setOpen(false);
              }}
            >
              <Text style={s.primaryText}>Use this date</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },
  heading: { fontSize: 17, fontWeight: "600", color: "#172033" },
  body: {
    padding: 24,
    gap: 24,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  description: { fontSize: 14, lineHeight: 22, color: "#64748b" },
  wheels: { flexDirection: "row", gap: 8 },
  columnTitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  selection: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ROW * 2,
    height: ROW,
    backgroundColor: "#eaf6fd",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9ed5ef",
  },
  wheelRow: { height: ROW, alignItems: "center", justifyContent: "center" },
  wheelText: { fontSize: 16, color: "#94a3b8" },
  selectedText: { color: "#0369a1", fontWeight: "700" },
  field: {
    minHeight: 50,
    borderBottomWidth: 1,
    borderColor: "#94a3b8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  value: { fontSize: 15, color: "#172033" },
  placeholder: { fontSize: 15, color: "#64748b" },
  chevron: { fontSize: 22, color: "#0369a1" },
  preview: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: "#172033",
  },
  primary: {
    minHeight: 50,
    backgroundColor: "#0369a1",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  touch: { minHeight: 44, justifyContent: "center" },
  link: { color: "#0369a1", fontSize: 14 },
  error: { color: "#b91c1c", fontSize: 14, lineHeight: 21 },
});
