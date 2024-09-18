import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import shortUUID from "short-uuid";
import { listSaves } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

export const backupRouter = createTRPCRouter({
  backupList: publicProcedure
    .input(
      z.object({
        sharelink: z.string().url(),
        customID: z.string().optional(),
      }),
    )
    .mutation(
      async ({
        input: { sharelink, customID },
        ctx,
      }): Promise<{ link: string } | { err: string }> => {
        const url = new URL(sharelink);

        const linkid =
          customID ?? shortUUID(shortUUID.constants.flickrBase58).new();
        try {
          const pushed = await ctx.db
            .insert(listSaves)
            .values({ id: linkid, link: url.pathname + url.search })
            .returning();

          if (pushed.length > 0 && pushed[0]) {
            const { id } = pushed[0];
            url.search = "";
            url.searchParams.set("q", id);
            return { link: String(url) };
          }
          return { err: "Could not insert into the database!" };
        } catch (e) {
          return { err: String(e) };
        }
      },
    ),
  getList: publicProcedure
    .input(z.string())
    .query(
      async ({
        input: id,
        ctx,
      }): Promise<{ err: string } | { link: string }> => {
        if (!id) return { err: "No backupID provided!" };

        const link = await ctx.db
          .select({ link: listSaves.link })
          .from(listSaves)
          .where(eq(listSaves.id, id))
          .limit(1);

        if (link.length > 0 && link[0]) {
          // got the link
          return { link: link[0].link };
        }

        return { err: "Could not find the link with given ID!" };
      },
    ),
  checkKanjiListIDAvailability: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }): Promise<true | { reason: string }> => {
      const sameID = await ctx.db
        .select({ num: sql<string>`count(${listSaves.id})` })
        .from(listSaves)
        .where(eq(listSaves.id, input));

      if (input.length < 6) {
        return { reason: "ID too short! Needs to be at least 6 characters!" };
      }
      if (!/^[a-z0-9_-]+$/i.exec(input)) {
        return { reason: "ID can only consist of [A-Za-z0-9_-]" };
      }

      const first = sameID[0];
      const num = parseInt(first?.num ?? "-1");
      if (num === 0) return true;
      return { reason: "ID already occupied!" };
    }),
});
