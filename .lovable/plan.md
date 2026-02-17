

# Add Help Widget Script to index.html

## What will change
A help widget script tag will be added to the `index.html` file, just before the closing `</body>` tag. This will load an external help widget from `go-in-sync.lovable.app` with the data source set to `smb_connect`.

## Technical Details

### File: `index.html`
Add the following script tag before `</body>`:
```html
<script src="https://go-in-sync.lovable.app/help-widget.js" data-source="smb_connect"></script>
```

No other files need changes.

