export async function exportDiaryData(client: any, userId: string) {
  async function all(table: string, columns: string, filter: string) {
    let result: any[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from(table)
        .select(columns)
        .eq(filter, userId)
        .order(table === "favorites" ? "post_id" : "post_id")
        .range(offset, offset + 499);
      if (error)
        throw new Error("Export could not finish. Nothing has been exported.");
      result.push(...(data || []));
      if ((data || []).length < 500) return result;
    }
  }
  const ownership = await all("diary_owners", "post_id", "user_id"),
    bookmarks = await all("favorites", "post_id", "user_id");
  let reflections: any[] = [];
  for (let i = 0; i < ownership.length; i += 100) {
    const { data, error } = await client
      .from("diaries")
      .select(
        "id,title,scripture,content,category,visibility,is_anonymous,created_at",
      )
      .in(
        "id",
        ownership.slice(i, i + 100).map((x) => x.post_id),
      );
    if (error)
      throw new Error("Export could not finish. Nothing has been exported.");
    reflections.push(...(data || []));
  }
  return JSON.stringify(
    {
      format: "bible-diaries-v1",
      exportedAt: new Date().toISOString(),
      reflections,
      bookmarks,
    },
    null,
    2,
  );
}
