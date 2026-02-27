package com.chiennc.book.utils;

public class TextUtils {
    /**
     * Chuyển đổi một chuỗi văn bản thuần (có hoặc không có dấu) thành một Regex
     * có thể match với bất kỳ chuỗi nào có cùng ký tự cơ bản, bất kể dấu tiếng Việt.
     * Chữ hoa/thường sẽ được xử lý bằng `$options` của MongoDB.
     */
    public static String toFuzzyRegex(String text) {
        if (text == null || text.trim().isEmpty()) {
            return ".*"; // Match everything if empty
        }

        StringBuilder regex = new StringBuilder(".*");
        for (char c : text.trim().toLowerCase().toCharArray()) {
            if (Character.isWhitespace(c)) {
                regex.append("\\s+");
            } else {
                regex.append(getVietnameseRegexClass(c));
            }
        }
        regex.append(".*");
        return regex.toString();
    }

    private static String getVietnameseRegexClass(char c) {
        switch (c) {
            case 'a': case 'á': case 'à': case 'ả': case 'ã': case 'ạ':
            case 'ă': case 'ắ': case 'ằ': case 'ẳ': case 'ẵ': case 'ặ':
            case 'â': case 'ấ': case 'ầ': case 'ẩ': case 'ẫ': case 'ậ':
                return "[aáàảãạăắằẳẵặâấầẩẫậAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ]";
            case 'e': case 'é': case 'è': case 'ẻ': case 'ẽ': case 'ẹ':
            case 'ê': case 'ế': case 'ề': case 'ể': case 'ễ': case 'ệ':
                return "[eéèẻẽẹêếềểễệEÉÈẺẼẸÊẾỀỂỄỆ]";
            case 'i': case 'í': case 'ì': case 'ỉ': case 'ĩ': case 'ị':
                return "[iíìỉĩịIÍÌỈĨỊ]";
            case 'o': case 'ó': case 'ò': case 'ỏ': case 'õ': case 'ọ':
            case 'ô': case 'ố': case 'ồ': case 'ổ': case 'ỗ': case 'ộ':
            case 'ơ': case 'ớ': case 'ờ': case 'ở': case 'ỡ': case 'ợ':
                return "[oóòỏõọôốồổỗộơớờởỡợOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ]";
            case 'u': case 'ú': case 'ù': case 'ủ': case 'ũ': case 'ụ':
            case 'ư': case 'ứ': case 'ừ': case 'ử': case 'ữ': case 'ự':
                return "[uúùủũụưứừửữựUÚÙỦŨỤƯỨỪỬỮỰ]";
            case 'y': case 'ý': case 'ỳ': case 'ỷ': case 'ỹ': case 'ỵ':
                return "[yýỳỷỹỵYÝỲỶỸỴ]";
            case 'd': case 'đ':
                return "[dđDĐ]";
            default:
                if (Character.isLetterOrDigit(c)) {
                    // Để bảo vệ các ký tự Regex đặc biệt, nhưng isLetterOrDigit an toàn
                    return "[" + Character.toLowerCase(c) + Character.toUpperCase(c) + "]";
                } else {
                    return "\\" + c;
                }
        }
    }
}
