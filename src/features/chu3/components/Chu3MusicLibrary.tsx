import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { CHU3_FAV_MUSIC, useChu3Favorites } from "@/hooks/useChu3Favorites";
import {
  chartRating,
  diffLabelByIdx,
  fmtScore,
  formatLv,
  playTime,
  rank,
  score,
} from "@/lib/chu3PlaylogView";
import { imgCross } from "@/lib/imgSign";
import { musicJacketUrl } from "@/lib/musicCover";
import { buildPageNumbers } from "@/lib/pagination";
import { getAppTexts } from "@/content/texts";
import type { MusicMetaLite } from "@/lib/scoring";
import type { Chu3UserMusicDetail, GamePlayRecord } from "@/lib/types";
import { Button, Checkbox, Input, Select, Typography } from 'antd'
import { SectionCard } from '@/components/ui/SectionCard'
import { Text } from '@/components/ui/Text'
import { useToast } from '@/components/ui/toast'

const PAGE_SIZE = 12;
const DIFF_IDS = [0, 1, 2, 3, 4, 10] as const;

type SongRow = {
  musicId: number;
  meta: MusicMetaLite;
  bestMap: Map<number, Chu3UserMusicDetail>;
  bestPlayMap: Map<number, GamePlayRecord>;
  playCount: number;
  search: string;
};

function showDiff(
  meta: MusicMetaLite,
  bestMap: Map<number, Chu3UserMusicDetail>,
  diffId: number,
) {
  if (diffId === 10) {
    const tag = meta.worldsEndTag?.trim();
    return (
      (tag != null && tag !== "" && tag !== "Invalid") || bestMap.has(10)
    );
  }
  return meta.notes?.[diffId] != null || bestMap.has(diffId);
}

function firstGenre(meta: MusicMetaLite): string {
  const raw =
    typeof (meta as { genre?: unknown }).genre === "string"
      ? (meta as { genre?: string }).genre
      : "";
  const g = raw?.trim();
  if (g) return g;
  const list = (meta as { genreNames?: unknown }).genreNames;
  if (Array.isArray(list)) {
    for (const one of list) {
      if (typeof one === "string" && one.trim()) return one.trim();
      if (one && typeof one === "object") {
        const name =
          typeof (one as { str?: unknown }).str === "string"
            ? String((one as { str?: unknown }).str)
            : "";
        if (name.trim()) return name.trim();
      }
    }
  }
  return "";
}

function orderedGenres(rows: SongRow[], ordered: string[]): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    const g = firstGenre(row.meta);
    if (g) set.add(g);
  });
  const extra = [...set]
    .filter(
      (one) => !ordered.includes(one),
    )
    .sort();
  return [...ordered.filter((one) => set.has(one)), ...extra];
}

export function Chu3MusicLibrary({
  musicById,
  detailRows,
  records = [],
  loading = false,
  error = null,
  locale = "zh",
  canFavorite = true,
}: {
  musicById: Record<number, MusicMetaLite>;
  detailRows: Chu3UserMusicDetail[];
  records?: GamePlayRecord[];
  loading?: boolean;
  error?: string | null;
  locale?: "zh" | "en";
  canFavorite?: boolean;
}) {
  const texts = getAppTexts(locale);
  const toast = useToast();
  const [key, setKey] = useState("");
  const [onlyPlayed, setOnlyPlayed] = useState(false);
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(1);
  const [pickMusicId, setPickMusicId] = useState<number | null>(null);
  const keySlow = useDeferredValue(key.trim().toLowerCase());
  const favorites = useChu3Favorites(canFavorite);

  const toggleFavorite = useCallback(
    async (musicId: number, name: string) => {
      try {
        const isAdd = await favorites.toggle(CHU3_FAV_MUSIC, musicId);
        if (isAdd == null) return;
        toast.add({
          title: isAdd
            ? texts.musicLibrary.favoriteAdded
            : texts.musicLibrary.favoriteRemoved,
          description: texts.musicLibrary.favoriteDesc(name, isAdd),
        });
      } catch (e) {
        toast.add({
          title: texts.musicLibrary.favoriteFailed,
          description: e instanceof Error ? e.message : texts.musicLibrary.favoriteFailed,
          variant: "error",
        });
      }
    },
    [favorites, texts, toast],
  );

  const rows = useMemo(() => {
    const bestBySong = new Map<number, Map<number, Chu3UserMusicDetail>>();
    const bestPlayBySong = new Map<number, Map<number, GamePlayRecord>>();
    const countBySong = new Map<number, number>();

    for (const row of detailRows) {
      const musicId = Number(row.musicId);
      if (!Number.isFinite(musicId)) continue;
      const diff = Math.max(0, Number(row.level ?? 0));
      const scoreNow = Number(row.scoreMax ?? 0);
      const bestMap =
        bestBySong.get(musicId) ?? new Map<number, Chu3UserMusicDetail>();
      const old = bestMap.get(diff);
      const oldScore = Number(old?.scoreMax ?? -1);
      if (!old || scoreNow > oldScore) bestMap.set(diff, row);
      bestBySong.set(musicId, bestMap);
      countBySong.set(
        musicId,
        (countBySong.get(musicId) ?? 0) + Number(row.playCount ?? 0),
      );
    }

    for (const row of records) {
      const musicId = Number(row.musicId);
      if (!Number.isFinite(musicId)) continue;
      const diff = Math.max(0, Number(row.level ?? 0));
      const scoreNow = score(row);
      const bestMap =
        bestPlayBySong.get(musicId) ?? new Map<number, GamePlayRecord>();
      const old = bestMap.get(diff);
      const oldScore = old ? score(old) : -1;
      const time = playTime(row);
      const oldTime = old ? playTime(old) : "";
      if (
        !old ||
        scoreNow > oldScore ||
        (scoreNow === oldScore && time > oldTime)
      ) {
        bestMap.set(diff, row);
      }
      bestPlayBySong.set(musicId, bestMap);
    }

    return Object.entries(musicById)
      .map(([id, meta]) => {
        const musicId = parseInt(id, 10);
        const search =
          `${musicId} ${meta.name ?? ""} ${meta.composer ?? ""} ${meta.ver ?? ""}`.toLowerCase();
        return {
          musicId,
          meta,
          bestMap: bestBySong.get(musicId) ?? new Map<number, Chu3UserMusicDetail>(),
          bestPlayMap: bestPlayBySong.get(musicId) ?? new Map<number, GamePlayRecord>(),
          playCount: countBySong.get(musicId) ?? 0,
          search,
        } satisfies SongRow;
      })
      .sort((a, b) => a.musicId - b.musicId);
  }, [detailRows, musicById, records]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (onlyPlayed && row.playCount <= 0) return false;
      if (onlyFavorite && !favorites.musicSet.has(row.musicId)) return false;
      if (genre && firstGenre(row.meta) !== genre) return false;
      if (!keySlow) return true;
      return row.search.includes(keySlow);
    });
  }, [favorites.musicSet, genre, keySlow, onlyFavorite, onlyPlayed, rows]);

  const genreOrder = texts.musicLibrary.genreOrder;
  const genreList = useMemo(() => orderedGenres(rows, genreOrder), [genreOrder, rows]);

  const totalPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const list = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const picked =
    filtered.find((row) => row.musicId === pickMusicId) ??
    filtered[0] ??
    null;
  const pickedDiffs = useMemo(() => {
    if (!picked) return [] as number[];
    const diffSet = new Set<number>();
    (picked.meta.notes ?? []).forEach((_, idx) => diffSet.add(idx));
    picked.bestMap.forEach((_, level) => diffSet.add(level));
    return [...diffSet].sort((a, b) => {
      if (a === 10) return 1;
      if (b === 10) return -1;
      return a - b;
    });
  }, [picked]);

  useEffect(() => {
    setPage(1);
  }, [genre, keySlow, onlyFavorite, onlyPlayed]);

  useEffect(() => {
    if (page > totalPage) setPage(totalPage);
  }, [page, totalPage]);

  useEffect(() => {
    if (!picked) {
      setPickMusicId(null);
      return;
    }
    if (pickMusicId !== picked.musicId) setPickMusicId(picked.musicId);
  }, [pickMusicId, picked]);

  const pickCover = picked ? musicJacketUrl("chu3", picked.musicId) : "";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
      <SectionCard className="min-w-0">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {texts.musicLibrary.title}
            </Typography.Title>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={texts.musicLibrary.searchPlaceholder}
              />
              <Select
                value={genre}
                onChange={(value) => setGenre(String(value ?? ""))}
                aria-label={texts.musicLibrary.genreFilter}
              >
                <Select.Option value="">
                  {texts.musicLibrary.allGenres}
                </Select.Option>
                {genreList.map((one) => (
                  <Select.Option key={one} value={one}>
                    {one}
                  </Select.Option>
                ))}
              </Select>
              <Checkbox checked={onlyPlayed} onChange={(e) => setOnlyPlayed(e.target.checked)}>
                {texts.musicLibrary.onlyPlayed}
              </Checkbox>
              {canFavorite ? (
                <Checkbox checked={onlyFavorite} onChange={(e) => setOnlyFavorite(e.target.checked)}>
                  {texts.musicLibrary.onlyFavorite}
                </Checkbox>
              ) : null}
            </div>
          </div>

          {canFavorite ? (
            <Text className="text-app-subtle text-sm">
              {texts.musicLibrary.favoriteCount(
                favorites.box.music.length,
                favorites.box.musicMax,
              )}
            </Text>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="small"
              disabled={page <= 1}
              onClick={() => setPage((x) => Math.max(1, x - 1))}
            >
              {texts.common.previousPage}
            </Button>
            {buildPageNumbers(page, totalPage).map((n) => (
              <Button
                key={n}
                size="small"
                type={n === page ? "primary" : "default"}
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              size="small"
              disabled={page >= totalPage}
              onClick={() => setPage((x) => Math.min(totalPage, x + 1))}
            >
              {texts.common.nextPage}
            </Button>
          </div>
        </div>

        {error ? (
          <Text className="text-app-danger mt-4 text-sm">
            {error}
          </Text>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading && !detailRows.length ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aq-skeleton h-24 rounded-xl" />
            ))
          ) : list.length ? (
            list.map((row) => {
              const cover = musicJacketUrl("chu3", row.musicId);
              const rowName = row.meta.name ?? texts.common.musicWithId(row.musicId);
              const isFav = favorites.musicSet.has(row.musicId);
              const favBusy = favorites.isBusy(CHU3_FAV_MUSIC, row.musicId);
              return (
                // 卡片里还嵌着一个「喜爱」按钮，所以外层不能再是 button——用 role 补回键盘可达性。
                <div
                  key={row.musicId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPickMusicId(row.musicId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPickMusicId(row.musicId);
                    }
                  }}
                  className={`border-app-line cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                    row.musicId === picked?.musicId
                      ? "bg-app-fill"
                      : "bg-app-recessed hover:bg-app-tint"
                  }`}
                >
                  <div className="flex gap-3">
                    <img
                      src={cover}
                      crossOrigin={imgCross(cover)}
                      alt=""
                      width={60}
                      height={60}
                      loading="lazy"
                      decoding="async"
                      className="h-[60px] w-[60px] shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-app-subtle text-xs">
                          #{row.musicId}
                        </span>
                        {row.playCount > 0 ? (
                          <span className="rounded-full bg-app-fill px-2 py-0.5 text-xs text-app-brand">
                            {texts.musicLibrary.playCount(row.playCount)}
                          </span>
                        ) : null}
                        {canFavorite ? (
                          <button
                            type="button"
                            aria-pressed={isFav}
                            aria-label={
                              isFav
                                ? texts.musicLibrary.unfavorite
                                : texts.musicLibrary.favorite
                            }
                            title={
                              isFav
                                ? texts.musicLibrary.unfavorite
                                : texts.musicLibrary.favorite
                            }
                            disabled={favorites.busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              void toggleFavorite(row.musicId, rowName);
                            }}
                            className={`ml-auto rounded-full px-1.5 text-lg leading-none transition-colors disabled:opacity-50 ${
                              isFav
                                ? "text-amber-500"
                                : "text-app-subtle hover:text-amber-500"
                            }`}
                          >
                            {favBusy ? "…" : isFav ? "★" : "☆"}
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-1 truncate text-base font-semibold">
                        {rowName}
                      </div>
                      <div className="text-app-subtle mt-1 truncate text-sm">
                        {row.meta.composer || texts.musicLibrary.unknownComposer}
                      </div>
                      <div className="text-app-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {row.meta.ver ? <span>{row.meta.ver}</span> : null}
                        {firstGenre(row.meta) ? (
                          <span>{firstGenre(row.meta)}</span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {DIFF_IDS.filter((diffId) =>
                          showDiff(row.meta, row.bestMap, diffId),
                        ).map((idx) => (
                          <span
                            key={`${row.musicId}-${idx}`}
                            className="rounded-full bg-app-base px-2 py-1 text-xs"
                          >
                            {diffLabelByIdx(idx, row.meta)}{" "}
                            {formatLv(row.meta, idx)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <Text className="text-app-subtle py-6 text-center">
              {texts.musicLibrary.noMatches}
            </Text>
          )}
        </div>
      </SectionCard>

      <SectionCard className="min-w-0">
        {picked ? (
          <>
            <div className="flex gap-4">
              <img
                src={pickCover}
                crossOrigin={imgCross(pickCover)}
                alt=""
                width={112}
                height={112}
                className="h-28 w-28 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="text-app-subtle text-xs">
                  #{picked.musicId}
                </div>
                <Typography.Title level={4} className="mt-1 break-words" style={{ margin: 0 }}>
                  {picked.meta.name ?? texts.common.musicWithId(picked.musicId)}
                </Typography.Title>
                <Text className="text-app-subtle mt-2 text-sm">
                  {picked.meta.composer || texts.musicLibrary.unknownComposer}
                </Text>
                <div className="text-app-subtle mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {firstGenre(picked.meta) ? (
                    <span>{firstGenre(picked.meta)}</span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-app-fill px-2 py-1">
                    {texts.musicLibrary.totalPlays(picked.playCount)}
                  </span>
                  {canFavorite && favorites.musicSet.has(picked.musicId) ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-1 text-amber-700 dark:text-amber-300">
                      ★ {texts.musicLibrary.favoriteBadge}
                    </span>
                  ) : null}
                </div>
                {canFavorite ? (
                  <div className="mt-3">
                    <Button
                      size="small"
                      type={favorites.musicSet.has(picked.musicId) ? "default" : "primary"}
                      disabled={favorites.busy}
                      onClick={() =>
                        void toggleFavorite(
                          picked.musicId,
                          picked.meta.name ?? texts.common.musicWithId(picked.musicId),
                        )
                      }
                    >
                      {favorites.isBusy(CHU3_FAV_MUSIC, picked.musicId)
                        ? texts.musicLibrary.favoriteWorking
                        : favorites.musicSet.has(picked.musicId)
                          ? texts.musicLibrary.unfavorite
                          : texts.musicLibrary.favorite}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              {pickedDiffs.map((idx) => {
                const best = picked.bestMap.get(idx);
                const bestPlay = picked.bestPlayMap.get(idx);
                const scoreNow = Number(best?.scoreMax ?? 0);
                const chartRt = best
                  ? chartRating(picked.meta, idx, { score: scoreNow })
                  : "—";
                return (
                  <div
                    key={`${picked.musicId}-${idx}`}
                    className="border-app-line rounded-xl border p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {diffLabelByIdx(idx, picked.meta)}
                        </div>
                        <div className="text-app-subtle text-xs">
                          Lv {formatLv(picked.meta, idx)}
                        </div>
                      </div>
                      {best ? (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {best.isAllJustice ? (
                            <span className="rounded-full bg-sky-500/15 px-2 py-1 text-sky-700 dark:text-sky-300">
                              AJ
                            </span>
                          ) : null}
                          {best.isFullCombo ? (
                            <span className="rounded-full bg-app-fill px-2 py-1 text-app-brand">
                              FC
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    {best ? (
                      <div className="mt-3 space-y-2">
                        <div className="rounded-lg bg-app-recessed p-3">
                          <div className="grid grid-cols-[84px_1fr] gap-2 text-sm sm:grid-cols-[96px_1fr]">
                            <div className="text-app-subtle">
                              {texts.musicLibrary.bestScore}
                            </div>
                            <div className="font-semibold">
                              {fmtScore(scoreNow)} · {rank(scoreNow)}
                            </div>
                            <div className="text-app-subtle">
                              {texts.musicLibrary.chartRating}
                            </div>
                            <div className="font-semibold">{chartRt}</div>
                            <div className="text-app-subtle">
                              {texts.musicLibrary.plays}
                            </div>
                            <div>{best.playCount ?? 0}</div>
                            <div className="text-app-subtle">{texts.musicLibrary.miss}</div>
                            <div>{best.missCount ?? 0}</div>
                            <div className="text-app-subtle">{texts.musicLibrary.justiceCritical}</div>
                            <div>
                              {(bestPlay?.judgeHeaven ?? 0) +
                                (bestPlay?.judgeCritical ?? 0)}
                            </div>
                            <div className="text-app-subtle">{texts.musicLibrary.justice}</div>
                            <div>{bestPlay?.judgeJustice ?? "—"}</div>
                            <div className="text-app-subtle">{texts.musicLibrary.attack}</div>
                            <div>{bestPlay?.judgeAttack ?? "—"}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Text className="text-app-subtle mt-3 text-sm">
                        {texts.musicLibrary.noRecord}
                      </Text>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Text className="text-app-subtle">
            {texts.musicLibrary.pickSong}
          </Text>
        )}
      </SectionCard>
    </div>
  );
}
