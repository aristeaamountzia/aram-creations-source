import { ImageEditorModal } from '../ImageEditorModal';

import type { PortfolioWorkspace } from './usePortfolioWorkspace';
import type { PortfolioMediaActions } from './createPortfolioMediaActions';

type Props = Pick<PortfolioWorkspace, 'imageEditorTarget' | 'setImageEditorTarget'> &
  Pick<PortfolioMediaActions, 'saveImageEdit'>;

export function PortfolioImageEditor(props: Props) {
  const { imageEditorTarget, setImageEditorTarget, saveImageEdit } = props;
  if (!imageEditorTarget) return null;
  return (
    <ImageEditorModal
      key={imageEditorTarget.url}
      open={Boolean(imageEditorTarget)}
      imageUrl={imageEditorTarget.url}
      title={imageEditorTarget.title}
      onClose={() => setImageEditorTarget(null)}
      originalUrl={imageEditorTarget.originalUrl}
      onSave={saveImageEdit}
    />
  );
}
