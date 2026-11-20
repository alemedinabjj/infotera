import { ImageResponse } from "next/og";
import { IconArt } from "./icon-art";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const AppleIcon = () => new ImageResponse(<IconArt size={180} scale={0.7} />, size);

export default AppleIcon;
