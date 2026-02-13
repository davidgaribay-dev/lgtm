declare module 'astro:content' {
	interface Render {
		'.mdx': Promise<{
			Content: import('astro').MDXContent;
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
			components: import('astro').MDXInstance<{}>['components'];
		}>;
	}
}

declare module 'astro:content' {
	export interface RenderResult {
		Content: import('astro/runtime/server/index.js').AstroComponentFactory;
		headings: import('astro').MarkdownHeading[];
		remarkPluginFrontmatter: Record<string, any>;
	}
	interface Render {
		'.md': Promise<RenderResult>;
	}

	export interface RenderedContent {
		html: string;
		metadata?: {
			imagePaths: Array<string>;
			[key: string]: unknown;
		};
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	export type ReferenceDataEntry<
		C extends CollectionKey,
		E extends keyof DataEntryMap[C] = string,
	> = {
		collection: C;
		id: E;
	};
	export type ReferenceContentEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}) = string,
	> = {
		collection: C;
		slug: E;
	};
	export type ReferenceLiveEntry<C extends keyof LiveContentConfig['collections']> = {
		collection: C;
		id: string;
	};

	/** @deprecated Use `getEntry` instead. */
	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	/** @deprecated Use `getEntry` instead. */
	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E,
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E,
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown,
	): Promise<CollectionEntry<C>[]>;

	export function getLiveCollection<C extends keyof LiveContentConfig['collections']>(
		collection: C,
		filter?: LiveLoaderCollectionFilterType<C>,
	): Promise<
		import('astro').LiveDataCollectionResult<LiveLoaderDataType<C>, LiveLoaderErrorType<C>>
	>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		entry: ReferenceContentEntry<C, E>,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		entry: ReferenceDataEntry<C, E>,
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E,
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E,
	): E extends keyof DataEntryMap[C]
		? string extends keyof DataEntryMap[C]
			? Promise<DataEntryMap[C][E]> | undefined
			: Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getLiveEntry<C extends keyof LiveContentConfig['collections']>(
		collection: C,
		filter: string | LiveLoaderEntryFilterType<C>,
	): Promise<import('astro').LiveDataEntryResult<LiveLoaderDataType<C>, LiveLoaderErrorType<C>>>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: ReferenceContentEntry<C, ValidContentEntrySlug<C>>[],
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: ReferenceDataEntry<C, keyof DataEntryMap[C]>[],
	): Promise<CollectionEntry<C>[]>;

	export function render<C extends keyof AnyEntryMap>(
		entry: AnyEntryMap[C][string],
	): Promise<RenderResult>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C,
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? ReferenceContentEntry<C, ValidContentEntrySlug<C>>
			: ReferenceDataEntry<C, keyof DataEntryMap[C]>
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C,
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"docs": {
"cli/auth.mdx": {
	id: "cli/auth.mdx";
  slug: "cli/auth";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/configuration.mdx": {
	id: "cli/configuration.mdx";
  slug: "cli/configuration";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/cycles.mdx": {
	id: "cli/cycles.mdx";
  slug: "cli/cycles";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/defects.mdx": {
	id: "cli/defects.mdx";
  slug: "cli/defects";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/environments.mdx": {
	id: "cli/environments.mdx";
  slug: "cli/environments";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/index.mdx": {
	id: "cli/index.mdx";
  slug: "cli";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/projects.mdx": {
	id: "cli/projects.mdx";
  slug: "cli/projects";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/shared-steps.mdx": {
	id: "cli/shared-steps.mdx";
  slug: "cli/shared-steps";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/test-cases.mdx": {
	id: "cli/test-cases.mdx";
  slug: "cli/test-cases";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/test-results.mdx": {
	id: "cli/test-results.mdx";
  slug: "cli/test-results";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"cli/test-runs.mdx": {
	id: "cli/test-runs.mdx";
  slug: "cli/test-runs";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/attachments.mdx": {
	id: "concepts/attachments.mdx";
  slug: "concepts/attachments";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/comments.mdx": {
	id: "concepts/comments.mdx";
  slug: "concepts/comments";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/cycles.mdx": {
	id: "concepts/cycles.mdx";
  slug: "concepts/cycles";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/defects.mdx": {
	id: "concepts/defects.mdx";
  slug: "concepts/defects";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/environments.mdx": {
	id: "concepts/environments.mdx";
  slug: "concepts/environments";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/overview.mdx": {
	id: "concepts/overview.mdx";
  slug: "concepts/overview";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/shared-steps.mdx": {
	id: "concepts/shared-steps.mdx";
  slug: "concepts/shared-steps";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/teams-and-rbac.mdx": {
	id: "concepts/teams-and-rbac.mdx";
  slug: "concepts/teams-and-rbac";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/test-cases.mdx": {
	id: "concepts/test-cases.mdx";
  slug: "concepts/test-cases";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/test-results.mdx": {
	id: "concepts/test-results.mdx";
  slug: "concepts/test-results";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"concepts/test-runs.mdx": {
	id: "concepts/test-runs.mdx";
  slug: "concepts/test-runs";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"getting-started/authentication.mdx": {
	id: "getting-started/authentication.mdx";
  slug: "getting-started/authentication";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"getting-started/installation.mdx": {
	id: "getting-started/installation.mdx";
  slug: "getting-started/installation";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"getting-started/quickstart.mdx": {
	id: "getting-started/quickstart.mdx";
  slug: "getting-started/quickstart";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"guides/api-tokens.mdx": {
	id: "guides/api-tokens.mdx";
  slug: "guides/api-tokens";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"guides/ci-cd-integration.mdx": {
	id: "guides/ci-cd-integration.mdx";
  slug: "guides/ci-cd-integration";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"guides/self-hosting.mdx": {
	id: "guides/self-hosting.mdx";
  slug: "guides/self-hosting";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"index.mdx": {
	id: "index.mdx";
  slug: "index";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"playwright-reporter/ci-integration.mdx": {
	id: "playwright-reporter/ci-integration.mdx";
  slug: "playwright-reporter/ci-integration";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"playwright-reporter/configuration.mdx": {
	id: "playwright-reporter/configuration.mdx";
  slug: "playwright-reporter/configuration";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"playwright-reporter/index.mdx": {
	id: "playwright-reporter/index.mdx";
  slug: "playwright-reporter";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"playwright-reporter/lifecycle.mdx": {
	id: "playwright-reporter/lifecycle.mdx";
  slug: "playwright-reporter/lifecycle";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"playwright-reporter/status-mapping.mdx": {
	id: "playwright-reporter/status-mapping.mdx";
  slug: "playwright-reporter/status-mapping";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"playwright-reporter/test-linking.mdx": {
	id: "playwright-reporter/test-linking.mdx";
  slug: "playwright-reporter/test-linking";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	type ExtractLoaderTypes<T> = T extends import('astro/loaders').LiveLoader<
		infer TData,
		infer TEntryFilter,
		infer TCollectionFilter,
		infer TError
	>
		? { data: TData; entryFilter: TEntryFilter; collectionFilter: TCollectionFilter; error: TError }
		: { data: never; entryFilter: never; collectionFilter: never; error: never };
	type ExtractDataType<T> = ExtractLoaderTypes<T>['data'];
	type ExtractEntryFilterType<T> = ExtractLoaderTypes<T>['entryFilter'];
	type ExtractCollectionFilterType<T> = ExtractLoaderTypes<T>['collectionFilter'];
	type ExtractErrorType<T> = ExtractLoaderTypes<T>['error'];

	type LiveLoaderDataType<C extends keyof LiveContentConfig['collections']> =
		LiveContentConfig['collections'][C]['schema'] extends undefined
			? ExtractDataType<LiveContentConfig['collections'][C]['loader']>
			: import('astro/zod').infer<
					Exclude<LiveContentConfig['collections'][C]['schema'], undefined>
				>;
	type LiveLoaderEntryFilterType<C extends keyof LiveContentConfig['collections']> =
		ExtractEntryFilterType<LiveContentConfig['collections'][C]['loader']>;
	type LiveLoaderCollectionFilterType<C extends keyof LiveContentConfig['collections']> =
		ExtractCollectionFilterType<LiveContentConfig['collections'][C]['loader']>;
	type LiveLoaderErrorType<C extends keyof LiveContentConfig['collections']> = ExtractErrorType<
		LiveContentConfig['collections'][C]['loader']
	>;

	export type ContentConfig = typeof import("../src/content/config.js");
	export type LiveContentConfig = never;
}
