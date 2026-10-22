# Fashion Archive

写真を中心に、所有しているファッションアイテムを記録・検索・集計する個人用PWAです。iPhoneのホーム画面から使うことを前提にしています。

公開アプリ: [https://ttm-i.github.io/fashion-archive/](https://ttm-i.github.io/fashion-archive/)

## 現在の機能

- アイテムの登録・編集・削除（写真は1件につき最大3枚）
- キーワード検索、絞り込み、並べ替え、お気に入り（未設定項目・購入先にも対応）
- 検索条件の再起動後復元、カラー・購入期間の絞り込み、一括クリア
- 一覧価格表示の切り替え、詳細画面の前後移動
- 購入金額・点数のカテゴリー別、ブランド別、年月別、カラー別、購入方法別、購入先別集計
- 集計年の切り替え、値引き総額、平均割引率
- 統計内訳の上位表示・全件展開と、内訳から該当アイテム一覧への移動
- ゴミ箱と復元
- カテゴリーの追加、名称変更、並べ替え
- 写真を含むZIPバックアップの作成・復元
- CSV出力
- オフライン動作とホーム画面への追加
- 入力途中の自動保存・再開
- データ変更に応じたバックアップ推奨案内
- 「ほしいもの」の登録・検索・編集と、購入後のコレクション移動
- 素材名と任意の混率（合計100%）の登録・候補再利用・詳細表示
- アウター・トップス・ボトムスの任意採寸記録（cm・小数対応）

データと写真は、利用している端末のブラウザ内（IndexedDB）にだけ保存されます。ブラウザのWebサイトデータを消すと失われるため、定期的にZIPバックアップを作成してください。

## Windowsでの起動

Node.jsとpnpmをインストールしたうえで、このフォルダーをPowerShellで開き、次を実行します。

```powershell
pnpm install
pnpm dev
```

画面に表示されたローカルURLをPCのブラウザで開きます。開発サーバーは `Ctrl+C` で終了できます。

## 確認コマンド

```powershell
pnpm test
pnpm run build
```

`pnpm run build` で公開用ファイルが `dist` フォルダーに生成されます。

## GitHub Pagesへの公開

`.github/workflows/deploy-pages.yml` を用意しています。GitHub上でPagesの公開元を「GitHub Actions」に設定すると、`main` ブランチへ反映するたびに次の処理が自動実行されます。

1. 必要なライブラリをインストール
2. 自動テスト
3. 公開用ビルド
4. GitHub Pagesへ公開

GitHub Pagesへの初回公開は完了しています。

## 設計資料

- [v1仕様書](docs/Fashion-Archive-v1-spec.md)
- [画面設計](docs/Fashion-Archive-screen-design.md)
- [実装・確認状況](docs/implementation-status.md)
- [改修ロードマップ](docs/Fashion-Archive-roadmap.md)

## 取り扱い上の注意

- バックアップの復元は、現在の端末内データをすべて置き換えます。実行前に確認画面を表示します。
- iPhoneでのホーム画面追加、カメラ撮影、ZIP保存・復元は、最終的に実機で確認します。
- 個人の写真やバックアップファイルをGitHubへ登録しないでください。`.gitignore` で一般的なバックアップ名と `test-data` を除外しています。
