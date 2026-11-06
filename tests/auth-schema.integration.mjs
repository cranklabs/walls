import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import pg from "pg"

const root = fileURLToPath(new URL("../", import.meta.url))

test("compatible auth migrations preserve data and prevent duplicate identities", async (t) => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Set TEST_DATABASE_URL to an empty isolated fixture database",
  )
  const url = new URL(process.env.TEST_DATABASE_URL)
  // Never run fixture writes against an arbitrary database supplied by mistake.
  assert.ok(["localhost", "127.0.0.1"].includes(url.hostname))
  assert.equal(url.pathname, "/walls_auth_test")
  assert.equal(url.username, "walls_test")
  assert.equal(url.password, "walls_test_fixture")
  const client = new pg.Client({ connectionString: url.toString() })
  const temporary = await mkdtemp(
    path.join(
      existsSync("/tmp/opencode") ? "/tmp/opencode" : tmpdir(),
      "walls-auth-schema-",
    ),
  )
  try {
    await client.connect()
    const empty = await client.query(
      "select count(*)::int as count from pg_tables where schemaname in ('public','drizzle')",
    )
    assert.equal(
      empty.rows[0].count,
      0,
      "Refusing to overwrite an existing database; use a new disposable fixture",
    )
    const journal = JSON.parse(
      await readFile(path.join(root, "drizzle/meta/_journal.json"), "utf8"),
    )
    await mkdir(path.join(temporary, "meta"))
    await writeFile(
      path.join(temporary, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 7) }),
    )
    for (const entry of journal.entries.slice(0, 7)) {
      await copyFile(
        path.join(root, "drizzle", `${entry.tag}.sql`),
        path.join(temporary, `${entry.tag}.sql`),
      )
    }
    const db = drizzle(client)
    await migrate(db, { migrationsFolder: temporary })
    await client.query(
      "insert into walls_user(id,email,name) values ('original-owner','member@example.com','Original Name'),('second-owner','other@example.com','Other Name')",
    )
    await client.query(
      "insert into walls_account(id,user_id,provider_id,account_id) values ('original-account','original-owner','discord','preserved-discord-id')",
    )
    await client.query(
      "insert into walls_file(name,base64,uploaded_by,height,width,size) values ('fixture.jpeg','Zml4dHVyZQ==','original-owner',1,1,7)",
    )
    const projection =
      "select id,name,base64,uploaded_by,height,width,size,nsfw,public_visibility,uploaded_at from walls_file order by id"
    const before = await client.query(projection)
    const beforeHash = createHash("sha256")
      .update(JSON.stringify(before.rows))
      .digest("hex")

    await migrate(db, { migrationsFolder: path.join(root, "drizzle") })
    const after = await client.query(projection)
    assert.equal(after.rows.length, 1)
    assert.equal(
      createHash("sha256").update(JSON.stringify(after.rows)).digest("hex"),
      beforeHash,
    )
    const users = await client.query(
      "select id,email,name from walls_user order by id",
    )
    assert.equal(users.rows.length, 2)
    assert.equal(users.rows[0].id, "original-owner")
    const account = await client.query(
      "select id,user_id,provider_id,account_id from walls_account",
    )
    assert.deepEqual(account.rows, [
      {
        id: "original-account",
        user_id: "original-owner",
        provider_id: "discord",
        account_id: "preserved-discord-id",
      },
    ])
    const migrated = await client.query(
      "select count(*)::int as count from drizzle.__drizzle_migrations",
    )
    assert.equal(migrated.rows[0].count, journal.entries.length)
    await migrate(db, { migrationsFolder: path.join(root, "drizzle") })
    assert.equal(
      (
        await client.query(
          "select count(*)::int as count from drizzle.__drizzle_migrations",
        )
      ).rows[0].count,
      journal.entries.length,
    )

    await t.test("case-folded duplicate emails are rejected", async () => {
      await assert.rejects(
        client.query(
          "insert into walls_user(id,email,name) values ('duplicate','MEMBER@example.com','Duplicate')",
        ),
        { code: "23505" },
      )
    })
    await t.test(
      "a provider identity cannot be attached to a second user",
      async () => {
        await assert.rejects(
          client.query(
            "insert into walls_account(id,user_id,provider_id,account_id) values ('duplicate-account','second-owner','discord','preserved-discord-id')",
          ),
          { code: "23505" },
        )
      },
    )
    await t.test(
      "different providers may have the same provider-local ID",
      async () => {
        await client.query(
          "insert into walls_account(id,user_id,provider_id,account_id) values ('google-account','second-owner','google','preserved-discord-id')",
        )
      },
    )
    await t.test(
      "concurrent same-email signups create at most one user",
      async () => {
        const pool = new pg.Pool({ connectionString: url.toString(), max: 2 })
        try {
          const results = await Promise.allSettled([
            pool.query(
              "insert into walls_user(id,email,name) values ('race-one','race@example.com','Race One')",
            ),
            pool.query(
              "insert into walls_user(id,email,name) values ('race-two','RACE@example.com','Race Two')",
            ),
          ])
          assert.equal(
            results.filter((result) => result.status === "fulfilled").length,
            1,
          )
          const rejected = results.find(
            (result) => result.status === "rejected",
          )
          assert.equal(rejected.reason.code, "23505")
        } finally {
          await pool.end()
        }
      },
    )
  } finally {
    await client.end()
    await rm(temporary, { recursive: true })
  }
})
