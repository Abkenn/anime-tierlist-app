import type { LocalTierlist } from './local-tierlist';

export type LocalTierlistContent = Pick<
  LocalTierlist,
  'items' | 'ranks' | 'imageMode' | 'posterSize' | 'updatedAt'
>;

const same = (first: unknown, second: unknown) =>
  JSON.stringify(first) === JSON.stringify(second);

// Rebase only this tab's edits onto the shared draft, never a remote-device conflict.
export const applyLocalTierlistEdit = (
  current: LocalTierlist,
  before: LocalTierlistContent,
  after: LocalTierlistContent,
): LocalTierlist => {
  const previous = new Map(before.items.map((item) => [item.id, item]));
  const edited = new Map(after.items.map((item) => [item.id, item]));
  const items = new Map(current.items.map((item) => [item.id, item]));

  previous.forEach((_, id) => {
    if (!edited.has(id)) {
      items.delete(id);
    }
  });
  edited.forEach((item, id) => {
    const original = previous.get(id);
    if (item === original) {
      return;
    }

    const latest = items.get(id);
    if (!original) {
      items.set(id, item);
    } else if (latest) {
      const changed = Object.fromEntries(
        Array.from(new Set([...Object.keys(original), ...Object.keys(item)]))
          .filter(
            (key) => !same(Reflect.get(original, key), Reflect.get(item, key)),
          )
          .map((key) => [key, Reflect.get(item, key)]),
      );
      items.set(id, { ...latest, ...changed });
    }
  });

  const reordered = !same(
    before.items.map((item) => item.id),
    after.items.map((item) => item.id),
  );
  const order = reordered ? after.items : current.items;
  const ordered = order.flatMap(({ id }) => {
    const item = items.get(id);
    items.delete(id);

    return item ? [item] : [];
  });

  return {
    ...current,
    updatedAt: after.updatedAt,
    revision: current.revision + 1,
    items: [...ordered, ...items.values()],
    ranks: same(before.ranks, after.ranks) ? current.ranks : after.ranks,
    posterSize:
      before.posterSize === after.posterSize
        ? current.posterSize
        : after.posterSize,
    imageMode:
      before.imageMode === after.imageMode
        ? current.imageMode
        : after.imageMode,
  };
};
