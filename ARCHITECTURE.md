# NDC Karuta Heroes 開発ガイド

このフォルダはビルド工程を必要としない、HTML / CSS / JavaScript 製のブラウザゲームです。

## 主要ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | 固定のDOM、モーダル、音声要素、スクリプト読み込み順 |
| `mode_loader.js` | 1366×768ステージの縮小表示、ゲーム本体の読み込み、公開APIの呼び出し |
| `fighters_config.js` | キャラクター、敵、難易度、2P操作、フォールバック札の静的設定 |
| `fighters_game.js` | 画面遷移、対戦進行、CPU、スキル、結果、エンディング |
| `fighters_tuning.json` | CPU反応速度、正答率、ダメージ、ゲージ、対戦台詞 |
| `audio_manager.js` | BGM、効果音、数字読み上げとフォールバック再生 |
| `styles.css` | 全画面のレイアウトと演出 |
| `ndc.json` | NDC番号と分類名 |
| `ending/ending.md` | キャラクター別エンディング文章 |

ギャラリーの解放状況は `localStorage` の `karutaGalleryProgressV1` に保存されます。
ストーリーモードの途中経過は別の `karutaStoryProgressV1` に保存され、キャラクター、難易度、ステージ、オープニング／エンディングの場面を復元します。セーブは新しいストーリーのキャラクター確定時に上書きされ、スタッフロール到達時に削除されます。
初回バトルのチュートリアル完了状況とキャラクター別の必殺技ガイド表示状況は `karutaTutorialProgressV1` に保存されます。チュートリアルはHELPから再実行できます。

## 読み込み順

1. `audio_manager.js`
2. `fighters_config.js`
3. `mode_loader.js`
4. `mode_loader.js` が `fighters_game.js` を動的に読み込む

`fighters_game.js` は `window.karutaFightersConfig` を使うため、`fighters_config.js` を先に読み込む必要があります。

## よくある変更

### プレイヤーキャラクターを追加する

1. `fighters_config.js` の `players` に設定を追加する。
2. `character/`、`cutin/`、`vs/`、`victory/`、`ending/` に必要素材を追加する。
3. 新しい `skillType` を使う場合のみ、`fighters_game.js` の `usePlayerSkill()` を拡張する。

### 敵を追加する

1. `fighters_config.js` の `enemies` にステージ順で追加する。
2. 必要素材と `fighters_tuning.json` の調整値を追加する。
3. 新しい `skillType` のみ `maybeActivateEnemySkill()` に実装する。

### 難易度を調整する

`fighters_config.js` の `difficulties` を編集します。

- `playerHp`: プレイヤーの最大HP
- `cpuSpeed`: CPU反応時間の倍率。小さいほど速い
- `cpuGauge`: CPUゲージ増加の倍率
- `cpuCorrectDelta`: 敵固有の正答率への加算値

### 対戦バランスを調整する

`fighters_tuning.json` を編集します。`local-dev/tuning-tool.html` は調整用画面です。

## `fighters_game.js` のセクション

1. Configuration and static data
2. DOM references
3. Runtime state
4. Shared helpers and input mapping
5. Ending and tuning data
6. Audio facade and visual effects
7. Screen rendering and UI lifecycle
8. Battle setup and turn loop
9. Player actions, damage, gauges and skills
10. Enemy skills and CPU behavior
11. Round resolution, results and reset
12. Public API

## 変更後の確認

1. JavaScriptの構文チェックを行う。
2. ローカルHTTPサーバーで `index.html` を開く。
3. タイトル → キャラクター選択 → VS → 対戦まで確認する。
4. 2P BATTLE設定画面も確認する。
5. コンソールに読み込みエラーがないことを確認する。

`old/`、`nouse/`、`magazine/`、`広報/` はゲーム実行時の主要依存先ではありません。
