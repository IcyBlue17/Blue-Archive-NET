import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Button } from "@cloudflare/kumo/components/button";
import { Checkbox } from "@cloudflare/kumo/components/checkbox";
import { Input } from "@cloudflare/kumo/components/input";
import { LayerCard } from "@cloudflare/kumo/components/layer-card";
import { Select } from "@cloudflare/kumo/components/select";
import { Text } from "@cloudflare/kumo/components/text";
import {
  chartRating1,
  diffLabelByIdx1,
  fmtScore1,
  formatLv1,
  playTime1,
  rank1,
  score1,
} from "../../lib/chu3PlaylogView";
import { imgCross1 } from "../../lib/imgSign";
import { musicJacketUrl } from "../../lib/musicCover";
import { getAppTexts } from "../../content/texts";
import type { MusicMetaLite } from "../../lib/scoring";
import type { Chu3UserMusicDetail, GamePlayRecord } from "../../lib/types";

const PAGE_SIZE = 12;
const DIFF_IDS1 = [0, 1, 2, 3, 4, 10] as const;
const CHU3_GENRES1 = [
  "POPS & ANIME",
  "niconico",
  "東方Project",
  "VARIETY",
  "イロドリミドリ",
  "ゲキマイ",
  "ORIGINAL",
] as const;

type SongRow1 = {
  musicId: number;
  meta: MusicMetaLite;
  bestMap1: Map<number, Chu3UserMusicDetail>;
  bestPlayMap1: Map<number, GamePlayRecord>;
  playCount1: number;
  search1: string;
};

function pageNums1(page: number, total: number): number[] {
  const start1 = Math.max(1, page - 2);
  const end1 = Math.min(total, start1 + 4);
  const out1: number[] = [];
  for (let i1 = start1; i1 <= end1; i1++) out1.push(i1);
  return out1;
}

function showDiff1(
  meta: MusicMetaLite,
  bestMap1: Map<number, Chu3UserMusicDetail>,
  diffId: number,
) {
  if (diffId === 10) {
    const tag1 = meta.worldsEndTag?.trim();
    return (
      (tag1 != null && tag1 !== "" && tag1 !== "Invalid") || bestMap1.has(10)
    );
  }
  return meta.notes?.[diffId] != null || bestMap1.has(diffId);
}

function firstGenre1(meta: MusicMetaLite): string {
  const raw1 =
    typeof (meta as { genre?: unknown }).genre === "string"
      ? (meta as { genre?: string }).genre
      : "";
  const g1 = raw1?.trim();
  if (g1) return g1;
  const list1 = (meta as { genreNames?: unknown }).genreNames;
  if (Array.isArray(list1)) {
    for (const one1 of list1) {
      if (typeof one1 === "string" && one1.trim()) return one1.trim();
      if (one1 && typeof one1 === "object") {
        const name1 =
          typeof (one1 as { str?: unknown }).str === "string"
            ? String((one1 as { str?: unknown }).str)
            : "";
        if (name1.trim()) return name1.trim();
      }
    }
  }
  return "";
}

function orderedGenres1(rows: SongRow1[]): string[] {
  const set1 = new Set<string>();
  rows.forEach((row1) => {
    const g1 = firstGenre1(row1.meta);
    if (g1) set1.add(g1);
  });
  const extra1 = [...set1]
    .filter(
      (one1) => !CHU3_GENRES1.includes(one1 as (typeof CHU3_GENRES1)[number]),
    )
    .sort();
  return [...CHU3_GENRES1.filter((one1) => set1.has(one1)), ...extra1];
}

export function Chu3MusicLibrary({
  musicById,
  detailRows,
  records = [],
  loading = false,
  error = null,
  locale = "zh",
}: {
  musicById: Record<number, MusicMetaLite>;
  detailRows: Chu3UserMusicDetail[];
  records?: GamePlayRecord[];
  loading?: boolean;
  error?: string | null;
  locale?: "zh" | "en";
}) {
  const texts = getAppTexts(locale);
  const [key1, setKey1] = useState("");
  const [onlyPlayed1, setOnlyPlayed1] = useState(false);
  const [genre1, setGenre1] = useState("");
  const [page1, setPage1] = useState(1);
  const [pickMusicId1, setPickMusicId1] = useState<number | null>(null);
  const keySlow1 = useDeferredValue(key1.trim().toLowerCase());

  const rows1 = useMemo(() => {
    const bestBySong1 = new Map<number, Map<number, Chu3UserMusicDetail>>();
    const bestPlayBySong1 = new Map<number, Map<number, GamePlayRecord>>();
    const countBySong1 = new Map<number, number>();

    for (const row1 of detailRows) {
      const musicId1 = Number(row1.musicId);
      if (!Number.isFinite(musicId1)) continue;
      const diff1 = Math.max(0, Number(row1.level ?? 0));
      const scoreNow1 = Number(row1.scoreMax ?? 0);
      const bestMap1 =
        bestBySong1.get(musicId1) ?? new Map<number, Chu3UserMusicDetail>();
      const old1 = bestMap1.get(diff1);
      const oldScore1 = Number(old1?.scoreMax ?? -1);
      if (!old1 || scoreNow1 > oldScore1) bestMap1.set(diff1, row1);
      bestBySong1.set(musicId1, bestMap1);
      countBySong1.set(
        musicId1,
        (countBySong1.get(musicId1) ?? 0) + Number(row1.playCount ?? 0),
      );
    }

    for (const row1 of records) {
      const musicId1 = Number(row1.musicId);
      if (!Number.isFinite(musicId1)) continue;
      const diff1 = Math.max(0, Number(row1.level ?? 0));
      const scoreNow1 = score1(row1);
      const bestMap1 =
        bestPlayBySong1.get(musicId1) ?? new Map<number, GamePlayRecord>();
      const old1 = bestMap1.get(diff1);
      const oldScore1 = old1 ? score1(old1) : -1;
      const time1 = playTime1(row1);
      const oldTime1 = old1 ? playTime1(old1) : "";
      if (
        !old1 ||
        scoreNow1 > oldScore1 ||
        (scoreNow1 === oldScore1 && time1 > oldTime1)
      ) {
        bestMap1.set(diff1, row1);
      }
      bestPlayBySong1.set(musicId1, bestMap1);
    }

    return Object.entries(musicById)
      .map(([id1, meta1]) => {
        const musicId1 = parseInt(id1, 10);
        const search1 =
          `${musicId1} ${meta1.name ?? ""} ${meta1.composer ?? ""} ${meta1.ver ?? ""}`.toLowerCase();
        return {
          musicId: musicId1,
          meta: meta1,
          bestMap1:
            bestBySong1.get(musicId1) ?? new Map<number, Chu3UserMusicDetail>(),
          bestPlayMap1:
            bestPlayBySong1.get(musicId1) ?? new Map<number, GamePlayRecord>(),
          playCount1: countBySong1.get(musicId1) ?? 0,
          search1,
        } satisfies SongRow1;
      })
      .sort((a1, b1) => a1.musicId - b1.musicId);
  }, [detailRows, musicById, records]);

  const filtered1 = useMemo(() => {
    return rows1.filter((row1) => {
      if (onlyPlayed1 && row1.playCount1 <= 0) return false;
      if (genre1 && firstGenre1(row1.meta) !== genre1) return false;
      if (!keySlow1) return true;
      return row1.search1.includes(keySlow1);
    });
  }, [genre1, keySlow1, onlyPlayed1, rows1]);

  const genreList1 = useMemo(() => orderedGenres1(rows1), [rows1]);

  const totalPage1 = Math.max(1, Math.ceil(filtered1.length / PAGE_SIZE));
  const list1 = filtered1.slice((page1 - 1) * PAGE_SIZE, page1 * PAGE_SIZE);
  const picked1 =
    filtered1.find((row1) => row1.musicId === pickMusicId1) ??
    filtered1[0] ??
    null;
  const pickedDiffs1 = useMemo(() => {
    if (!picked1) return [] as number[];
    const diffSet1 = new Set<number>();
    (picked1.meta.notes ?? []).forEach((_, idx1) => diffSet1.add(idx1));
    picked1.bestMap1.forEach((_, level1) => diffSet1.add(level1));
    return [...diffSet1].sort((a1, b1) => {
      if (a1 === 10) return 1;
      if (b1 === 10) return -1;
      return a1 - b1;
    });
  }, [picked1]);

  useEffect(() => {
    setPage1(1);
  }, [genre1, keySlow1, onlyPlayed1]);

  useEffect(() => {
    if (page1 > totalPage1) setPage1(totalPage1);
  }, [page1, totalPage1]);

  useEffect(() => {
    if (!picked1) {
      setPickMusicId1(null);
      return;
    }
    if (pickMusicId1 !== picked1.musicId) setPickMusicId1(picked1.musicId);
  }, [pickMusicId1, picked1]);

  const pickCover1 = picked1 ? musicJacketUrl("chu3", picked1.musicId) : "";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
      <LayerCard className="min-w-0 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Text variant="heading3">
              {texts.musicLibrary.title}
            </Text>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={key1}
                onChange={(e) => setKey1(e.target.value)}
                placeholder={texts.musicLibrary.searchPlaceholder}
              />
              <Select
                value={genre1}
                onValueChange={(value1) => setGenre1(String(value1 ?? ""))}
                aria-label={texts.musicLibrary.genreFilter}
              >
                <Select.Option value="">
                  {texts.musicLibrary.allGenres}
                </Select.Option>
                {genreList1.map((one1) => (
                  <Select.Option key={one1} value={one1}>
                    {one1}
                  </Select.Option>
                ))}
              </Select>
              <Checkbox
                controlFirst
                checked={onlyPlayed1}
                onCheckedChange={setOnlyPlayed1}
                label={texts.musicLibrary.onlyPlayed}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page1 <= 1}
              onClick={() => setPage1((x1) => Math.max(1, x1 - 1))}
            >
              {texts.common.previousPage}
            </Button>
            {pageNums1(page1, totalPage1).map((n1) => (
              <Button
                key={n1}
                size="sm"
                variant={n1 === page1 ? "primary" : "secondary"}
                onClick={() => setPage1(n1)}
              >
                {n1}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              disabled={page1 >= totalPage1}
              onClick={() => setPage1((x1) => Math.min(totalPage1, x1 + 1))}
            >
              {texts.common.nextPage}
            </Button>
          </div>
        </div>

        {error ? (
          <Text DANGEROUS_className="text-kumo-danger mt-4 text-sm">
            {error}
          </Text>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading && !detailRows.length ? (
            Array.from({ length: 6 }).map((_, i1) => (
              <div key={i1} className="aq-skeleton h-24 rounded-xl" />
            ))
          ) : list1.length ? (
            list1.map((row1) => {
              const cover1 = musicJacketUrl("chu3", row1.musicId);
              return (
                <button
                  key={row1.musicId}
                  type="button"
                  onClick={() => setPickMusicId1(row1.musicId)}
                  className={`border-kumo-border rounded-xl border p-3 text-left transition-colors ${
                    row1.musicId === picked1?.musicId
                      ? "bg-kumo-fill/70"
                      : "bg-kumo-surface-secondary/30 hover:bg-kumo-surface-secondary/60"
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={cover1}
                      crossOrigin={imgCross1(cover1)}
                      alt=""
                      width={60}
                      height={60}
                      loading="lazy"
                      decoding="async"
                      className="h-[60px] w-[60px] shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-kumo-subtle text-xs">
                          #{row1.musicId}
                        </span>
                        {row1.playCount1 > 0 ? (
                          <span className="rounded-full bg-kumo-accent/12 px-2 py-0.5 text-xs text-kumo-accent">
                            {texts.musicLibrary.playCount(row1.playCount1)}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold">
                        {row1.meta.name ?? `Music ${row1.musicId}`}
                      </div>
                      <div className="text-kumo-subtle mt-1 truncate text-sm">
                        {row1.meta.composer || texts.musicLibrary.unknownComposer}
                      </div>
                      <div className="text-kumo-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {row1.meta.ver ? <span>{row1.meta.ver}</span> : null}
                        {firstGenre1(row1.meta) ? (
                          <span>{firstGenre1(row1.meta)}</span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DIFF_IDS1.filter((diffId1) =>
                          showDiff1(row1.meta, row1.bestMap1, diffId1),
                        ).map((idx1) => (
                          <span
                            key={`${row1.musicId}-${idx1}`}
                            className="rounded-full bg-kumo-background px-2 py-1 text-xs"
                          >
                            {diffLabelByIdx1(idx1, row1.meta)}{" "}
                            {formatLv1(row1.meta, idx1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <Text DANGEROUS_className="text-kumo-subtle py-6 text-center">
              {texts.musicLibrary.noMatches}
            </Text>
          )}
        </div>
      </LayerCard>

      <LayerCard className="min-w-0 p-4">
        {picked1 ? (
          <>
            <div className="flex gap-4">
              <img
                src={pickCover1}
                crossOrigin={imgCross1(pickCover1)}
                alt=""
                width={112}
                height={112}
                className="h-28 w-28 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="text-kumo-subtle text-xs">
                  #{picked1.musicId}
                </div>
                <Text variant="heading3" DANGEROUS_className="mt-1 break-words">
                  {picked1.meta.name ?? `Music ${picked1.musicId}`}
                </Text>
                <Text DANGEROUS_className="text-kumo-subtle mt-2 text-sm">
                  {picked1.meta.composer || texts.musicLibrary.unknownComposer}
                </Text>
                <div className="text-kumo-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {firstGenre1(picked1.meta) ? (
                    <span>{firstGenre1(picked1.meta)}</span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-kumo-fill px-2 py-1">
                    {texts.musicLibrary.totalPlays(picked1.playCount1)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {pickedDiffs1.map((idx1) => {
                const best1 = picked1.bestMap1.get(idx1);
                const bestPlay1 = picked1.bestPlayMap1.get(idx1);
                const scoreNow1 = Number(best1?.scoreMax ?? 0);
                const chartRt1 = best1
                  ? chartRating1(picked1.meta, idx1, { score: scoreNow1 })
                  : "—";
                return (
                  <div
                    key={`${picked1.musicId}-${idx1}`}
                    className="border-kumo-border rounded-xl border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {diffLabelByIdx1(idx1, picked1.meta)}
                        </div>
                        <div className="text-kumo-subtle text-xs">
                          Lv {formatLv1(picked1.meta, idx1)}
                        </div>
                      </div>
                      {best1 ? (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {best1.isAllJustice ? (
                            <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">
                              AJ
                            </span>
                          ) : null}
                          {best1.isFullCombo ? (
                            <span className="rounded-full bg-kumo-accent/15 px-2 py-1 text-kumo-accent">
                              FC
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {best1 ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg bg-kumo-surface-secondary/50 p-3">
                          <div className="grid grid-cols-[84px_1fr] gap-2 text-sm sm:grid-cols-[96px_1fr]">
                            <div className="text-kumo-subtle">
                              {texts.musicLibrary.bestScore}
                            </div>
                            <div className="font-semibold">
                              {fmtScore1(scoreNow1)} · {rank1(scoreNow1)}
                            </div>
                            <div className="text-kumo-subtle">
                              {texts.musicLibrary.chartRating}
                            </div>
                            <div className="font-semibold">{chartRt1}</div>
                            <div className="text-kumo-subtle">
                              {texts.musicLibrary.plays}
                            </div>
                            <div>{best1.playCount ?? 0}</div>
                            <div className="text-kumo-subtle">Miss</div>
                            <div>{best1.missCount ?? 0}</div>
                            <div className="text-kumo-subtle">Justice C.</div>
                            <div>
                              {(bestPlay1?.judgeHeaven ?? 0) +
                                (bestPlay1?.judgeCritical ?? 0)}
                            </div>
                            <div className="text-kumo-subtle">Justice</div>
                            <div>{bestPlay1?.judgeJustice ?? "—"}</div>
                            <div className="text-kumo-subtle">Attack</div>
                            <div>{bestPlay1?.judgeAttack ?? "—"}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Text DANGEROUS_className="text-kumo-subtle mt-3 text-sm">
                        {texts.musicLibrary.noRecord}
                      </Text>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Text DANGEROUS_className="text-kumo-subtle">
            {texts.musicLibrary.pickSong}
          </Text>
        )}
      </LayerCard>
    </div>
  );
}
