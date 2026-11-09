import {
  previewControlsLayout,
  previewExportLayout,
  previewNoticeLayout,
  previewTemplateLayout,
} from '@/app/_lib/preview-controls-layout';

export const PreviewControlsLoading = () => (
  <div className={previewControlsLayout}>
    <div className={previewNoticeLayout}>
      <span role="status" className="font-medium">
        Loading preview controls...
      </span>

      <div aria-hidden="true" className={previewTemplateLayout}>
        <span className="invisible inline-flex min-h-9 items-center">
          Create your own tierlist
        </span>

        <span className="invisible inline-flex min-h-9 items-center">
          Use as a template
        </span>
      </div>
    </div>

    <div aria-hidden="true" className={previewExportLayout}>
      <span className="invisible inline-flex min-h-9 items-center">
        Save project
      </span>

      <span className="invisible inline-flex min-h-9 items-center">
        Copy PNG
      </span>

      <span className="invisible inline-flex min-h-9 items-center">
        Download as PNG
      </span>
    </div>
  </div>
);
